import { randomUUID } from 'node:crypto'

import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
  vi
} from 'vitest'
import { load } from 'cheerio'

import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'

import { spokeAuth } from '#test-helpers/spoke-auth.js'
import { createServer } from '#server/server.js'
import { registrationClient } from '#server/services/registration-client.js'

const CPH = '10/081/1234'
const REGISTER_PATH = `/holdings/${CPH}/cattle/register`
const CSRF_TOKEN = 'test-csrf-token'
const csrfHeaders = {
  'sec-fetch-site': 'same-origin',
  'x-lis-csrf-token': CSRF_TOKEN
}
const NOW = new Date('2026-11-05T10:00:00Z')

const calfDetailsPayload = {
  earTagNumber: 'UK123456301550',
  dateOfBirth: '1/11/2026',
  sex: 'female',
  breed: 'Aberdeen Angus (AA)'
}

/**
 * @param {'*'|string[]} cphs
 * @param {object} [options]
 * @param {string[]} [options.permissions]
 * @param {string} [options.sub]
 * @returns {object} a hydrated user with those permissions on those CPHs
 */
function createUser(
  cphs,
  { permissions = ['lis-perm-cattle-register-write'], sub = 'test-user' } = {}
) {
  return {
    sub,
    email: 'test.user@example.com',
    statements: [{ role: 'lis-role-keeper', cphs, permissions }]
  }
}

const keeperAuth = spokeAuth(createUser([CPH]))

/**
 * @param {string} registrationId
 * @param {number|string} [calfNumber]
 * @returns {string}
 */
function damDetailsPath(registrationId, calfNumber = 1) {
  return `${REGISTER_PATH}/${registrationId}/calves/${calfNumber}/dam-details`
}

describe('dam details routes', () => {
  let server

  /**
   * Starts a registration, for the keeper, whose first calf has its calf
   * details saved.
   * @param {object} [answers]
   * @returns {Promise<string>} the registration id
   */
  async function registrationWithCalfDetails(answers = calfDetailsPayload) {
    const registrationId = randomUUID()
    await registrationClient.saveCalfDetails({
      cph: CPH,
      registrationId,
      userId: 'test-user',
      answers
    })
    return registrationId
  }

  /**
   * @param {string} registrationId
   * @param {object} payload
   * @param {object} [options]
   * @param {object} [options.auth]
   * @param {number|string} [options.calfNumber]
   * @returns {Promise<object>} the response
   */
  function postDamDetails(
    registrationId,
    payload,
    { auth = keeperAuth, calfNumber = 1 } = {}
  ) {
    return server.inject({
      method: 'POST',
      url: damDetailsPath(registrationId, calfNumber),
      auth,
      headers: csrfHeaders,
      payload: { ...payload, _csrf: CSRF_TOKEN }
    })
  }

  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET dam details', () => {
    test('it renders the question about the calf', async () => {
      // Arrange
      const registrationId = await registrationWithCalfDetails()

      // Act
      const response = await server.inject({
        method: 'GET',
        url: damDetailsPath(registrationId),
        auth: keeperAuth
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.ok)
      const $ = load(response.payload)
      expect($('title').text().trim()).toMatch(/^Dam details - /)
      expect($('h1').text().trim()).toBe('Dam details')
      expect($('legend .govuk-caption-l').text().trim()).toBe(
        'Official animal ear tag number: UK123456301550'
      )
      expect($('.govuk-back-link').attr('href')).toBe(
        `${REGISTER_PATH}/${registrationId}/calf-details`
      )
      expect($('main form').attr('action')).toBe(damDetailsPath(registrationId))
      expect($('main form').attr('method')).toBe('post')
      expect($('.govuk-error-summary')).toHaveLength(0)
      expect($('label[for="damType"]').text().trim()).toBe(
        'Calf born via genetic dam'
      )
      expect($('label[for="damType-2"]').text().trim()).toBe(
        'Calf born via surrogate dam'
      )
      expect($('#damType').val()).toBe('genetic')
      expect($('#damType-2').val()).toBe('surrogate')
      expect($('input[name="damType"]:checked')).toHaveLength(0)
      expect($('main form button').text().trim()).toBe('Continue')
    })

    test('it escapes the calf ear tag number', async () => {
      // Arrange
      const registrationId = await registrationWithCalfDetails({
        ...calfDetailsPayload,
        earTagNumber: '<b>UK1</b>'
      })

      // Act
      const response = await server.inject({
        method: 'GET',
        url: damDetailsPath(registrationId),
        auth: keeperAuth
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.ok)
      const $ = load(response.payload)
      expect($('legend b')).toHaveLength(0)
      expect($('legend .govuk-caption-l').text().trim()).toBe(
        'Official animal ear tag number: <b>UK1</b>'
      )
    })

    test('it shows the saved answer', async () => {
      // Arrange
      const registrationId = await registrationWithCalfDetails()
      await postDamDetails(registrationId, { damType: 'surrogate' })

      // Act
      const response = await server.inject({
        method: 'GET',
        url: damDetailsPath(registrationId),
        auth: keeperAuth
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.ok)
      const $ = load(response.payload)
      expect($('input[name="damType"]:checked').val()).toBe('surrogate')
    })

    test('it sends the user to calf details before calf details is saved', async () => {
      // Arrange
      const registrationId = randomUUID()

      // Act
      const response = await server.inject({
        method: 'GET',
        url: damDetailsPath(registrationId),
        auth: keeperAuth
      })

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(
        `${REGISTER_PATH}/${registrationId}/calf-details`
      )
    })

    test('it sends another user to calf details for their own registration', async () => {
      // Arrange
      const registrationId = await registrationWithCalfDetails()
      const auth = spokeAuth(createUser([CPH], { sub: 'other-user' }))

      // Act
      const response = await server.inject({
        method: 'GET',
        url: damDetailsPath(registrationId),
        auth
      })

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(
        `${REGISTER_PATH}/${registrationId}/calf-details`
      )
    })

    test('it returns not found for a calf the registration does not have', async () => {
      // Arrange
      const registrationId = await registrationWithCalfDetails()

      // Act
      const response = await server.inject({
        method: 'GET',
        url: damDetailsPath(registrationId, 2),
        auth: keeperAuth
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
    })

    test.each([
      ['zero', '0'],
      ['a leading zero', '01'],
      ['a negative number', '-1'],
      ['a decimal', '1.5'],
      ['not a number', 'one'],
      ['more than three digits', '1000']
    ])(
      'it returns not found for a calf number that is %s',
      async (_description, calfNumber) => {
        // Arrange
        const registrationId = await registrationWithCalfDetails()

        // Act
        const response = await server.inject({
          method: 'GET',
          url: damDetailsPath(registrationId, calfNumber),
          auth: keeperAuth
        })

        // Assert
        expect(response.statusCode).toBe(statusCodes.notFound)
      }
    )

    test('it returns not found for a registration id that is not a UUID', async () => {
      // Arrange
      const request = {
        method: 'GET',
        url: damDetailsPath('REG-123'),
        auth: keeperAuth
      }

      // Act
      const response = await server.inject(request)

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
    })

    test.each([
      ['a CPH the user is not granted', createUser(['22/002/0002'])],
      [
        'a user with only read permission',
        createUser([CPH], { permissions: ['lis-perm-cattle-register-read'] })
      ]
    ])('it returns not found for %s', async (_description, user) => {
      // Arrange
      const registrationId = await registrationWithCalfDetails()
      const getCalf = vi.spyOn(registrationClient, 'getCalf')

      // Act
      const response = await server.inject({
        method: 'GET',
        url: damDetailsPath(registrationId),
        auth: spokeAuth(user)
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
      expect(getCalf).not.toHaveBeenCalled()
    })
  })
})
