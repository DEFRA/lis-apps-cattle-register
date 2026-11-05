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
const EAR_TAG_HINT =
  'Enter the full animal ear tag number. For example, UK123456123456'
const surrogateDamPayload = {
  geneticDamEarTagNumber: 'UK123456501100',
  surrogateDamEarTagNumber: 'UK123456601200'
}

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
function surrogateDamPath(registrationId, calfNumber = 1) {
  return `${REGISTER_PATH}/${registrationId}/calves/${calfNumber}/surrogate-dam`
}

/**
 * @param {string} registrationId
 * @param {string} page
 * @returns {string} the path of a page about calf 1
 */
function calfOnePath(registrationId, page) {
  return `${REGISTER_PATH}/${registrationId}/calves/1/${page}`
}

describe('surrogate dam routes', () => {
  let server

  /**
   * @param {string} url
   * @param {object} payload - posted, by default, as about the first
   *   calf saved in these tests (see demandSameCalf())
   * @param {object} [auth]
   * @returns {Promise<object>} the response
   */
  function post(url, payload, auth = keeperAuth) {
    return server.inject({
      method: 'POST',
      url,
      auth,
      headers: csrfHeaders,
      payload: {
        calfEarTagNumber: calfDetailsPayload.earTagNumber,
        ...payload,
        _csrf: CSRF_TOKEN
      }
    })
  }

  /**
   * Starts a registration whose first calf has its calf details and,
   * optionally, its dam type saved.
   * @param {object} [options]
   * @param {string | null} [options.damType] - null leaves dam details unanswered
   * @param {object} [options.calfDetails]
   * @returns {Promise<string>} the registration id
   */
  async function registration({
    damType = 'surrogate',
    calfDetails = calfDetailsPayload
  } = {}) {
    const registrationId = randomUUID()
    const calfResponse = await post(
      `${REGISTER_PATH}/${registrationId}/calf-details`,
      calfDetails
    )
    expect(calfResponse.statusCode).toBe(302)

    if (damType) {
      const damResponse = await post(
        calfOnePath(registrationId, 'dam-details'),
        { calfEarTagNumber: calfDetails.earTagNumber, damType }
      )
      expect(damResponse.statusCode).toBe(302)
    }

    return registrationId
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

  /**
   * @param {string} registrationId
   * @param {number|string} [calfNumber]
   * @returns {Promise<object>} the response to a GET of the page
   */
  function get(registrationId, calfNumber = 1) {
    return server.inject({
      method: 'GET',
      url: surrogateDamPath(registrationId, calfNumber),
      auth: keeperAuth
    })
  }

  describe('GET surrogate dam', () => {
    test('it renders the questions about the calf', async () => {
      // Arrange
      const registrationId = await registration()

      // Act
      const response = await get(registrationId)

      // Assert
      expect(response.statusCode).toBe(statusCodes.ok)
      const $ = load(response.payload)
      expect($('title').text().trim()).toMatch(
        /^Genetic and surrogate dam details - /
      )
      expect($('h1').text().trim()).toBe('Genetic and surrogate dam details')
      expect($('main .govuk-caption-l').text().trim()).toBe(
        'Official animal ear tag number: UK 123456 301550'
      )
      expect($('#geneticDamEarTagNumber').attr('maxlength')).toBe('200')
      expect($('#surrogateDamEarTagNumber').attr('maxlength')).toBe('200')
      expect($('.govuk-back-link').attr('href')).toBe(
        calfOnePath(registrationId, 'dam-details')
      )
      expect($('main form').attr('action')).toBe(
        surrogateDamPath(registrationId)
      )
      expect($('main form').attr('method')).toBe('post')
      expect($('.govuk-error-summary')).toHaveLength(0)
      expect($('label[for="geneticDamEarTagNumber"]').text().trim()).toBe(
        'Genetic dam ear tag number'
      )
      expect($('label[for="surrogateDamEarTagNumber"]').text().trim()).toBe(
        'Surrogate dam ear tag number'
      )
      expect($('#geneticDamEarTagNumber-hint').text().trim()).toBe(EAR_TAG_HINT)
      expect($('#surrogateDamEarTagNumber-hint').text().trim()).toBe(
        EAR_TAG_HINT
      )
      expect($('#geneticDamEarTagNumber').val()).toBe('')
      expect($('#surrogateDamEarTagNumber').val()).toBe('')
      expect($('main form button').text().trim()).toBe('Continue')
    })

    test('it escapes the calf ear tag number', async () => {
      // Arrange
      const registrationId = await registration({
        calfDetails: { ...calfDetailsPayload, earTagNumber: '<b>UK1</b>' }
      })

      // Act
      const response = await get(registrationId)

      // Assert
      const $ = load(response.payload)
      expect($('main b')).toHaveLength(0)
      expect($('main .govuk-caption-l').text().trim()).toBe(
        'Official animal ear tag number: <b>UK1</b>'
      )
    })

    test('it shows the saved answers', async () => {
      // Arrange
      const registrationId = await registration()
      await post(surrogateDamPath(registrationId), surrogateDamPayload)

      // Act
      const response = await get(registrationId)

      // Assert
      const $ = load(response.payload)
      expect($('#geneticDamEarTagNumber').val()).toBe('UK123456501100')
      expect($('#surrogateDamEarTagNumber').val()).toBe('UK123456601200')
    })

    test.each([
      ['dam details is not answered', null],
      ['the calf was born via a genetic dam', 'genetic']
    ])(
      'it sends the user to dam details when %s',
      async (_description, damType) => {
        // Arrange
        const registrationId = await registration({ damType })

        // Act
        const response = await get(registrationId)

        // Assert
        expect(response.statusCode).toBe(302)
        expect(response.headers.location).toBe(
          calfOnePath(registrationId, 'dam-details')
        )
      }
    )

    test('it sends the user to calf details before calf details is saved', async () => {
      // Arrange
      const registrationId = randomUUID()

      // Act
      const response = await get(registrationId)

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(
        `${REGISTER_PATH}/${registrationId}/calf-details`
      )
    })

    test.each([
      ['a calf the registration does not have', '2'],
      ['a calf number of zero', '0'],
      ['a calf number of more than three digits', '1000'],
      ['a calf number that is not a number', 'one']
    ])('it returns not found for %s', async (_description, calfNumber) => {
      // Arrange
      const registrationId = await registration()

      // Act
      const response = await get(registrationId, calfNumber)

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
      const registrationId = await registration()
      const getCalf = vi.spyOn(registrationClient, 'getCalf')

      // Act
      const response = await server.inject({
        method: 'GET',
        url: surrogateDamPath(registrationId),
        auth: spokeAuth(user)
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
      expect(getCalf).not.toHaveBeenCalled()
    })
  })
})
