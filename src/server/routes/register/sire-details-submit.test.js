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
const sireDetailsPayload = {
  sireEarTagNumber: 'UK123456701300',
  sireName: 'Big Bob'
}
const damPayloads = {
  'genetic-dam': { earTagNumber: 'UK123456501100' },
  'surrogate-dam': {
    geneticDamEarTagNumber: 'UK123456501100',
    surrogateDamEarTagNumber: 'UK123456601200'
  }
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
function sireDetailsPath(registrationId, calfNumber = 1) {
  return `${REGISTER_PATH}/${registrationId}/calves/${calfNumber}/sire-details`
}

/**
 * @param {string} registrationId
 * @param {string} page
 * @returns {string} the path of a page about calf 1
 */
function calfOnePath(registrationId, page) {
  return `${REGISTER_PATH}/${registrationId}/calves/1/${page}`
}

describe('sire details submit routes', () => {
  let server

  /**
   * @param {string} url
   * @param {object} payload
   * @param {object} [auth]
   * @returns {Promise<object>} the response
   */
  function post(url, payload, auth = keeperAuth) {
    return server.inject({
      method: 'POST',
      url,
      auth,
      headers: csrfHeaders,
      payload: { ...payload, _csrf: CSRF_TOKEN }
    })
  }

  /**
   * Starts a registration whose first calf has its calf details saved and,
   * optionally, its dam type and the page about that dam.
   * @param {object} [options]
   * @param {string | null} [options.damType] - null leaves dam details unanswered
   * @param {boolean} [options.damSaved] - false leaves the dam page unanswered
   * @param {object} [options.calfDetails]
   * @returns {Promise<string>} the registration id
   */
  async function registration({
    damType = 'genetic',
    damSaved = true,
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
        { damType }
      )
      expect(damResponse.statusCode).toBe(302)
    }

    if (damType && damSaved) {
      const page = `${damType}-dam`
      const damPageResponse = await post(
        calfOnePath(registrationId, page),
        damPayloads[page]
      )
      expect(damPageResponse.statusCode).toBe(302)
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
      url: sireDetailsPath(registrationId, calfNumber),
      auth: keeperAuth
    })
  }

  describe('POST sire details', () => {
    test('it saves the sire details and continues to check calf details', async () => {
      // Arrange
      const registrationId = await registration()
      const saveSireDetails = vi.spyOn(registrationClient, 'saveSireDetails')

      // Act
      const response = await post(sireDetailsPath(registrationId), {
        ...sireDetailsPayload,
        unexpected: 'ignored'
      })

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(
        calfOnePath(registrationId, 'check-calf-details')
      )
      expect(saveSireDetails).toHaveBeenCalledWith({
        cph: CPH,
        registrationId,
        userId: 'test-user',
        calfNumber: 1,
        answers: sireDetailsPayload
      })
    })

    test.each([
      ['no answers', {}],
      ['blank answers', { sireEarTagNumber: '', sireName: '' }]
    ])(
      'it continues to check calf details with %s, as both are optional',
      async (_description, payload) => {
        // Arrange
        const registrationId = await registration()

        // Act
        const response = await post(sireDetailsPath(registrationId), payload)

        // Assert
        expect(response.statusCode).toBe(302)
        expect(response.headers.location).toBe(
          calfOnePath(registrationId, 'check-calf-details')
        )
        const page = load((await get(registrationId)).payload)
        expect(page('#sireEarTagNumber').val()).toBe('')
        expect(page('#sireName').val()).toBe('')
      }
    )

    test('it does not keep a sire ear tag number that has been cleared', async () => {
      // Arrange
      const registrationId = await registration()
      await post(sireDetailsPath(registrationId), sireDetailsPayload)
      await post(sireDetailsPath(registrationId), {
        sireEarTagNumber: '',
        sireName: 'Big Bob'
      })

      // Act
      const response = await get(registrationId)

      // Assert
      const $ = load(response.payload)
      expect($('#sireEarTagNumber').val()).toBe('')
      expect($('#sireName').val()).toBe('Big Bob')
    })

    test('it continues from a calf born via a surrogate dam', async () => {
      // Arrange
      const registrationId = await registration({ damType: 'surrogate' })

      // Act
      const response = await post(
        sireDetailsPath(registrationId),
        sireDetailsPayload
      )

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(
        calfOnePath(registrationId, 'check-calf-details')
      )
    })

    test('it sends the user to the dam page before it is saved', async () => {
      // Arrange
      const registrationId = await registration({ damSaved: false })
      const saveSireDetails = vi.spyOn(registrationClient, 'saveSireDetails')

      // Act
      const response = await post(
        sireDetailsPath(registrationId),
        sireDetailsPayload
      )

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(
        calfOnePath(registrationId, 'genetic-dam')
      )
      expect(saveSireDetails).not.toHaveBeenCalled()
    })

    test('it sends the user to calf details when the calf expires as the answers are sent', async () => {
      // Arrange
      const registrationId = await registration()
      vi.spyOn(registrationClient, 'saveSireDetails').mockResolvedValueOnce(
        null
      )

      // Act
      const response = await post(
        sireDetailsPath(registrationId),
        sireDetailsPayload
      )

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(
        `${REGISTER_PATH}/${registrationId}/calf-details`
      )
    })

    test('it returns not found for a later calf that expires as the answers are sent', async () => {
      // Arrange
      const registrationId = randomUUID()
      vi.spyOn(registrationClient, 'getCalf').mockResolvedValueOnce({
        calfDetails: calfDetailsPayload,
        damDetails: { damType: 'genetic' },
        geneticDam: damPayloads['genetic-dam'],
        surrogateDam: {},
        sireDetails: {}
      })
      vi.spyOn(registrationClient, 'saveSireDetails').mockResolvedValueOnce(
        null
      )

      // Act
      const response = await post(
        sireDetailsPath(registrationId, 2),
        sireDetailsPayload
      )

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
    })

    test('it returns not found for a CPH the user is not granted', async () => {
      // Arrange
      const registrationId = await registration()
      const saveSireDetails = vi.spyOn(registrationClient, 'saveSireDetails')

      // Act
      const response = await post(
        sireDetailsPath(registrationId),
        sireDetailsPayload,
        spokeAuth(createUser(['22/002/0002']))
      )

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
      expect(saveSireDetails).not.toHaveBeenCalled()
    })

    test('it returns bad request for an answer longer than the field limit', async () => {
      // Arrange
      const registrationId = await registration()

      // Act
      const response = await post(sireDetailsPath(registrationId), {
        ...sireDetailsPayload,
        sireName: 'B'.repeat(201)
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.badRequest)
    })

    test('it rejects a post with no CSRF token', async () => {
      // Arrange
      const registrationId = await registration()
      const saveSireDetails = vi.spyOn(registrationClient, 'saveSireDetails')

      // Act
      const response = await server.inject({
        method: 'POST',
        url: sireDetailsPath(registrationId),
        auth: keeperAuth,
        headers: csrfHeaders,
        payload: sireDetailsPayload
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.forbidden)
      expect(saveSireDetails).not.toHaveBeenCalled()
    })
  })
})
