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
import { DRAFT_TTL_MS } from '#server/services/draft-store.js'
import { registrationClient } from '#server/services/registration-client.js'

const CPH = '10/081/1234'
const REGISTER_PATH = `/holdings/${CPH}/cattle/register`
const CSRF_TOKEN = 'test-csrf-token'
const csrfHeaders = {
  'sec-fetch-site': 'same-origin',
  'x-lis-csrf-token': CSRF_TOKEN
}
const NOW = new Date('2026-11-05T10:00:00Z')
const LATE_DATE = '8/10/2026'

const calfDetailsPayload = {
  earTagNumber: 'UK123456301550',
  dateOfBirth: '1/11/2026',
  sex: 'female',
  breed: 'Aberdeen Angus (AA)'
}

/**
 * @param {object} [overrides] - user fields to replace, sub included
 * @returns {object} a hydrated keeper with register write on the CPH
 */
function createUser(overrides = {}) {
  return {
    sub: 'test-user',
    email: 'test.user@example.com',
    statements: [
      {
        role: 'lis-role-keeper',
        cphs: [CPH],
        permissions: ['lis-perm-cattle-register-write']
      }
    ],
    ...overrides
  }
}

const keeperAuth = spokeAuth(createUser())

/**
 * @param {string} registrationId
 * @returns {string}
 */
function calfDetailsPath(registrationId) {
  return `${REGISTER_PATH}/${registrationId}/calf-details`
}

/**
 * @param {string} registrationId
 * @param {number} [calfNumber]
 * @returns {string}
 */
function damDetailsPath(registrationId, calfNumber = 1) {
  return `${REGISTER_PATH}/${registrationId}/calves/${calfNumber}/dam-details`
}

/**
 * @param {string} registrationId
 * @param {number} [calfNumber]
 * @returns {string}
 */
function geneticDamPath(registrationId, calfNumber = 1) {
  return `${REGISTER_PATH}/${registrationId}/calves/${calfNumber}/genetic-dam`
}

describe('registration drafts', () => {
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
    vi.setSystemTime(NOW)
  })

  describe('a late date of birth', () => {
    test('it is not saved until the warning is confirmed', async () => {
      // Arrange
      const registrationId = randomUUID()
      const payload = { ...calfDetailsPayload, dateOfBirth: LATE_DATE }
      const warned = await post(calfDetailsPath(registrationId), payload)

      // Act
      const response = await server.inject({
        method: 'GET',
        url: damDetailsPath(registrationId),
        auth: keeperAuth
      })

      // Assert
      expect(warned.statusCode).toBe(statusCodes.ok)
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(calfDetailsPath(registrationId))
    })

    test('it is saved once confirmed, and dam details can be reached', async () => {
      // Arrange
      const registrationId = randomUUID()
      const payload = { ...calfDetailsPayload, dateOfBirth: LATE_DATE }
      const saveCalfDetails = vi.spyOn(registrationClient, 'saveCalfDetails')
      await post(calfDetailsPath(registrationId), payload)
      const confirmed = await post(calfDetailsPath(registrationId), {
        ...payload,
        acknowledgedLateDateOfBirth: LATE_DATE
      })

      // Act
      const response = await server.inject({
        method: 'GET',
        url: damDetailsPath(registrationId),
        auth: keeperAuth
      })

      // Assert
      expect(confirmed.statusCode).toBe(302)
      expect(confirmed.headers.location).toBe(damDetailsPath(registrationId))
      expect(saveCalfDetails).toHaveBeenLastCalledWith(
        expect.objectContaining({ acknowledgedWarnings: ['overDeadline'] })
      )
      expect(response.statusCode).toBe(statusCodes.ok)
    })

    test('an unconfirmed change leaves the saved answers as they were', async () => {
      // Arrange
      const registrationId = randomUUID()
      await post(calfDetailsPath(registrationId), calfDetailsPayload)
      await post(calfDetailsPath(registrationId), {
        ...calfDetailsPayload,
        dateOfBirth: LATE_DATE,
        sex: 'male'
      })

      // Act
      const response = await server.inject({
        method: 'GET',
        url: calfDetailsPath(registrationId),
        auth: keeperAuth
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.ok)
      const $ = load(response.payload)
      expect($('#dateOfBirth').val()).toBe(calfDetailsPayload.dateOfBirth)
      expect($('input[name="sex"]:checked').val()).toBe('female')
    })
  })

  describe('an expired registration', () => {
    test('dam details sends the user back to calf details', async () => {
      // Arrange
      const registrationId = randomUUID()
      await post(calfDetailsPath(registrationId), calfDetailsPayload)
      vi.setSystemTime(NOW.getTime() + DRAFT_TTL_MS)

      // Act
      const response = await server.inject({
        method: 'GET',
        url: damDetailsPath(registrationId),
        auth: keeperAuth
      })

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(calfDetailsPath(registrationId))
    })

    test('dam details for a later calf sends the user back to calf details', async () => {
      // Arrange
      const registrationId = randomUUID()

      // Act
      const response = await server.inject({
        method: 'GET',
        url: damDetailsPath(registrationId, 3),
        auth: keeperAuth
      })

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(calfDetailsPath(registrationId))
    })

    test('calf details for a later calf sends the user back to calf details', async () => {
      // Arrange
      const registrationId = randomUUID()

      // Act
      const response = await server.inject({
        method: 'GET',
        url: `${REGISTER_PATH}/${registrationId}/calves/3/calf-details`,
        auth: keeperAuth
      })

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(calfDetailsPath(registrationId))
    })

    test('calf details answers for a later calf go back to calf details', async () => {
      // Arrange
      const registrationId = randomUUID()
      const saveCalfDetails = vi.spyOn(registrationClient, 'saveCalfDetails')

      // Act
      const response = await post(
        `${REGISTER_PATH}/${registrationId}/calves/3/calf-details`,
        calfDetailsPayload
      )

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(calfDetailsPath(registrationId))
      expect(saveCalfDetails).toHaveBeenCalled()
      expect(
        await registrationClient.getRegistration({
          cph: CPH,
          registrationId,
          userId: 'test-user'
        })
      ).toBeNull()
    })

    test('a genetic dam answer for a later calf goes back to calf details', async () => {
      // Arrange
      const registrationId = randomUUID()

      // Act
      const response = await post(geneticDamPath(registrationId, 2), {
        earTagNumber: 'UK123456501100'
      })

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(calfDetailsPath(registrationId))
    })

    test('dam details for a calf a started registration does not have is not found', async () => {
      // Arrange
      const registrationId = randomUUID()
      await post(calfDetailsPath(registrationId), calfDetailsPayload)

      // Act
      const response = await server.inject({
        method: 'GET',
        url: damDetailsPath(registrationId, 2),
        auth: keeperAuth
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
    })

    test('a dam details answer sent as it expires goes back to calf details', async () => {
      // Arrange
      const registrationId = randomUUID()
      await post(calfDetailsPath(registrationId), calfDetailsPayload)
      vi.spyOn(registrationClient, 'saveDamDetails').mockResolvedValueOnce(null)

      // Act
      const response = await post(damDetailsPath(registrationId), {
        damType: 'genetic'
      })

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(calfDetailsPath(registrationId))
    })

    test('a dam details answer for a later calf no longer in the registration is not found', async () => {
      // Arrange
      const registrationId = randomUUID()
      vi.spyOn(registrationClient, 'getCalf').mockResolvedValueOnce({
        calfDetails: calfDetailsPayload,
        damDetails: {}
      })
      vi.spyOn(registrationClient, 'saveDamDetails').mockResolvedValueOnce(null)

      vi.spyOn(registrationClient, 'getRegistration').mockResolvedValueOnce({
        calves: [],
        canAddCalf: true
      })

      // Act
      const response = await post(damDetailsPath(registrationId, 2), {
        damType: 'genetic'
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
    })

    test('a genetic dam answer sent as it expires goes back to calf details', async () => {
      // Arrange
      const registrationId = randomUUID()
      await post(calfDetailsPath(registrationId), calfDetailsPayload)
      await post(damDetailsPath(registrationId), { damType: 'genetic' })
      vi.spyOn(registrationClient, 'saveGeneticDam').mockResolvedValueOnce(null)

      // Act
      const response = await post(geneticDamPath(registrationId), {
        earTagNumber: 'UK123456501100'
      })

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(calfDetailsPath(registrationId))
    })

    test('a genetic dam answer for a later calf no longer in the registration is not found', async () => {
      // Arrange
      const registrationId = randomUUID()
      vi.spyOn(registrationClient, 'getCalf').mockResolvedValueOnce({
        calfDetails: calfDetailsPayload,
        damDetails: { damType: 'genetic' },
        geneticDam: {}
      })
      vi.spyOn(registrationClient, 'saveGeneticDam').mockResolvedValueOnce(null)

      vi.spyOn(registrationClient, 'getRegistration').mockResolvedValueOnce({
        calves: [],
        canAddCalf: true
      })

      // Act
      const response = await post(geneticDamPath(registrationId, 2), {
        earTagNumber: 'UK123456501100'
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
    })
  })

  test('a saved dam type with no next page is an error, not a broken link', async () => {
    // Arrange
    const registrationId = randomUUID()
    await post(calfDetailsPath(registrationId), calfDetailsPayload)
    vi.spyOn(registrationClient, 'saveDamDetails').mockResolvedValueOnce({
      errors: []
    })

    // Act
    const response = await post(damDetailsPath(registrationId), {
      damType: 'adoptive'
    })

    // Assert
    expect(response.statusCode).toBe(statusCodes.internalServerError)
  })

  describe('a user without an id', () => {
    test.each([
      ['a missing id', { sub: undefined }],
      ['a blank id', { sub: '' }]
    ])('calf details is not found for %s', async (_description, overrides) => {
      // Arrange
      const getCalfDetails = vi.spyOn(registrationClient, 'getCalfDetails')

      // Act
      const response = await server.inject({
        method: 'GET',
        url: calfDetailsPath(randomUUID()),
        auth: spokeAuth(createUser(overrides))
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
      expect(getCalfDetails).not.toHaveBeenCalled()
    })

    test('calf details answers are not saved', async () => {
      // Arrange
      const saveCalfDetails = vi.spyOn(registrationClient, 'saveCalfDetails')

      // Act
      const response = await post(
        calfDetailsPath(randomUUID()),
        calfDetailsPayload,
        spokeAuth(createUser({ sub: undefined }))
      )

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
      expect(saveCalfDetails).not.toHaveBeenCalled()
    })

    test('dam details is not found', async () => {
      // Arrange
      const getCalf = vi.spyOn(registrationClient, 'getCalf')

      // Act
      const response = await server.inject({
        method: 'GET',
        url: damDetailsPath(randomUUID()),
        auth: spokeAuth(createUser({ sub: undefined }))
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
      expect(getCalf).not.toHaveBeenCalled()
    })
  })
})
