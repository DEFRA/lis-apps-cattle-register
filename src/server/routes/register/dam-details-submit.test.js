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
const DAM_TYPE_MESSAGE =
  'Select if the calf was born via a genetic or surrogate dam'

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

describe('dam details submit routes', () => {
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
   * @param {object} payload - posted, by default, as about the first
   *   calf saved in these tests (see demandSameCalf())
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
      payload: {
        calfEarTagNumber: calfDetailsPayload.earTagNumber,
        ...payload,
        _csrf: CSRF_TOKEN
      }
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

  describe('POST dam details', () => {
    test.each([
      ['genetic', 'genetic-dam'],
      ['surrogate', 'surrogate-dam']
    ])('it saves a %s dam and continues to %s', async (damType, nextPage) => {
      // Arrange
      const registrationId = await registrationWithCalfDetails()
      const saveDamDetails = vi.spyOn(registrationClient, 'saveDamDetails')

      // Act
      const response = await postDamDetails(registrationId, {
        damType,
        unexpected: 'ignored'
      })

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(
        `${REGISTER_PATH}/${registrationId}/calves/1/${nextPage}`
      )
      expect(saveDamDetails).toHaveBeenCalledWith({
        cph: CPH,
        registrationId,
        userId: 'test-user',
        calfNumber: 1,
        answers: { damType }
      })
    })

    test.each([
      ['no answer', {}],
      ['a blank answer', { damType: '' }],
      ['an answer that is not an option', { damType: 'adoptive' }]
    ])('it shows the error for %s', async (_description, payload) => {
      // Arrange
      const registrationId = await registrationWithCalfDetails()

      // Act
      const response = await postDamDetails(registrationId, payload)

      // Assert
      expect(response.statusCode).toBe(statusCodes.badRequest)
      const $ = load(response.payload)
      expect($('title').text().trim()).toMatch(/^Error: Dam details - /)
      expect($('.govuk-error-summary__title').text().trim()).toBe(
        'There is a problem'
      )
      expect($('.govuk-error-summary__list a').text().trim()).toBe(
        DAM_TYPE_MESSAGE
      )
      expect($('.govuk-error-summary__list a').attr('href')).toBe('#damType')
      expect($('#damType-error').text().trim()).toBe(
        `Error: ${DAM_TYPE_MESSAGE}`
      )
      expect($('legend .govuk-caption-l').text().trim()).toBe(
        'Official animal ear tag number: UK 123456 301550'
      )
      expect($('input[name="damType"]:checked')).toHaveLength(0)
    })

    test('it keeps the saved answer when a later post has errors', async () => {
      // Arrange
      const registrationId = await registrationWithCalfDetails()
      await postDamDetails(registrationId, { damType: 'genetic' })
      await postDamDetails(registrationId, { damType: '' })

      // Act
      const response = await server.inject({
        method: 'GET',
        url: damDetailsPath(registrationId),
        auth: keeperAuth
      })

      // Assert
      const $ = load(response.payload)
      expect($('input[name="damType"]:checked').val()).toBe('genetic')
    })

    test('it sends the user to calf details before calf details is saved', async () => {
      // Arrange
      const registrationId = randomUUID()
      const saveDamDetails = vi.spyOn(registrationClient, 'saveDamDetails')

      // Act
      const response = await postDamDetails(registrationId, {
        damType: 'genetic'
      })

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(
        `${REGISTER_PATH}/${registrationId}/calf-details`
      )
      expect(saveDamDetails).not.toHaveBeenCalled()
    })

    test('it returns not found for a calf the registration does not have', async () => {
      // Arrange
      const registrationId = await registrationWithCalfDetails()

      // Act
      const response = await postDamDetails(
        registrationId,
        { damType: 'genetic' },
        { calfNumber: 2 }
      )

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
    })

    test('it does not let another user answer the registration of the first user', async () => {
      // Arrange
      const registrationId = await registrationWithCalfDetails()
      const auth = spokeAuth(createUser([CPH], { sub: 'other-user' }))

      // Act
      const response = await postDamDetails(
        registrationId,
        { damType: 'genetic' },
        { auth }
      )

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(
        `${REGISTER_PATH}/${registrationId}/calf-details`
      )
      const calf = await registrationClient.getCalf({
        cph: CPH,
        registrationId,
        userId: 'test-user',
        calfNumber: 1
      })
      expect(calf.damDetails).toEqual({})
    })

    test('it returns not found for a CPH the user is not granted', async () => {
      // Arrange
      const registrationId = await registrationWithCalfDetails()
      const saveDamDetails = vi.spyOn(registrationClient, 'saveDamDetails')

      // Act
      const response = await postDamDetails(
        registrationId,
        { damType: 'genetic' },
        { auth: spokeAuth(createUser(['22/002/0002'])) }
      )

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
      expect(saveDamDetails).not.toHaveBeenCalled()
    })

    test('it returns bad request for an answer longer than the field limit', async () => {
      // Arrange
      const registrationId = await registrationWithCalfDetails()

      // Act
      const response = await postDamDetails(registrationId, {
        damType: 'g'.repeat(201)
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.badRequest)
    })

    test('it rejects a post with no CSRF token', async () => {
      // Arrange
      const registrationId = await registrationWithCalfDetails()
      const saveDamDetails = vi.spyOn(registrationClient, 'saveDamDetails')

      // Act
      const response = await server.inject({
        method: 'POST',
        url: damDetailsPath(registrationId),
        auth: keeperAuth,
        headers: csrfHeaders,
        payload: { damType: 'genetic' }
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.forbidden)
      expect(saveDamDetails).not.toHaveBeenCalled()
    })
  })
})
