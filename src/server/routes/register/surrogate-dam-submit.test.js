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
const GENETIC_MESSAGE = 'Enter the animal ear tag number of the genetic dam'
const SURROGATE_MESSAGE = 'Enter the animal ear tag number of the surrogate dam'
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

describe('surrogate dam submit routes', () => {
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
        { damType }
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

  describe('POST surrogate dam', () => {
    test('it saves the surrogate dam and continues to sire details', async () => {
      // Arrange
      const registrationId = await registration()
      const saveSurrogateDam = vi.spyOn(registrationClient, 'saveSurrogateDam')

      // Act
      const response = await post(surrogateDamPath(registrationId), {
        ...surrogateDamPayload,
        unexpected: 'ignored'
      })

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(
        calfOnePath(registrationId, 'sire-details')
      )
      expect(saveSurrogateDam).toHaveBeenCalledWith({
        cph: CPH,
        registrationId,
        userId: 'test-user',
        calfNumber: 1,
        answers: surrogateDamPayload
      })
    })

    test.each([
      ['no answers', {}],
      [
        'blank answers',
        { geneticDamEarTagNumber: '', surrogateDamEarTagNumber: '' }
      ],
      [
        'whitespace-only answers',
        { geneticDamEarTagNumber: '   ', surrogateDamEarTagNumber: ' ' }
      ]
    ])('it shows both errors for %s', async (_description, payload) => {
      // Arrange
      const registrationId = await registration()

      // Act
      const response = await post(surrogateDamPath(registrationId), payload)

      // Assert
      expect(response.statusCode).toBe(statusCodes.badRequest)
      const $ = load(response.payload)
      expect($('title').text().trim()).toMatch(
        /^Error: Genetic and surrogate dam details - /
      )
      expect($('.govuk-error-summary__title').text().trim()).toBe(
        'There is a problem'
      )
      const links = $('.govuk-error-summary__list a')
        .map((_index, link) => ({
          text: $(link).text().trim(),
          href: $(link).attr('href')
        }))
        .get()
      expect(links).toEqual([
        { text: GENETIC_MESSAGE, href: '#geneticDamEarTagNumber' },
        { text: SURROGATE_MESSAGE, href: '#surrogateDamEarTagNumber' }
      ])
      expect($('#geneticDamEarTagNumber-error').text().trim()).toBe(
        `Error: ${GENETIC_MESSAGE}`
      )
      expect($('#surrogateDamEarTagNumber-error').text().trim()).toBe(
        `Error: ${SURROGATE_MESSAGE}`
      )
      expect($('#surrogateDamEarTagNumber').attr('aria-describedby')).toBe(
        'surrogateDamEarTagNumber-hint surrogateDamEarTagNumber-error'
      )
    })

    test.each([
      ['geneticDamEarTagNumber', 'surrogateDamEarTagNumber', GENETIC_MESSAGE],
      ['surrogateDamEarTagNumber', 'geneticDamEarTagNumber', SURROGATE_MESSAGE]
    ])(
      'it shows only the %s error and keeps the other answer',
      async (blankField, answeredField, message) => {
        // Arrange
        const registrationId = await registration()

        // Act
        const response = await post(surrogateDamPath(registrationId), {
          ...surrogateDamPayload,
          [blankField]: ''
        })

        // Assert
        expect(response.statusCode).toBe(statusCodes.badRequest)
        const $ = load(response.payload)
        expect($('.govuk-error-summary__list a').text().trim()).toBe(message)
        expect($(`#${answeredField}-error`)).toHaveLength(0)
        expect($(`#${answeredField}`).val()).toBe(
          surrogateDamPayload[answeredField]
        )
      }
    )

    test('it keeps the saved answers when a later post has errors', async () => {
      // Arrange
      const registrationId = await registration()
      await post(surrogateDamPath(registrationId), surrogateDamPayload)
      await post(surrogateDamPath(registrationId), {})

      // Act
      const response = await get(registrationId)

      // Assert
      const $ = load(response.payload)
      expect($('#geneticDamEarTagNumber').val()).toBe('UK123456501100')
      expect($('#surrogateDamEarTagNumber').val()).toBe('UK123456601200')
    })

    test('it discards the surrogate dam when dam details changes to genetic', async () => {
      // Arrange
      const registrationId = await registration()
      await post(surrogateDamPath(registrationId), surrogateDamPayload)
      await post(calfOnePath(registrationId, 'dam-details'), {
        damType: 'genetic'
      })
      await post(calfOnePath(registrationId, 'dam-details'), {
        damType: 'surrogate'
      })

      // Act
      const response = await get(registrationId)

      // Assert
      const $ = load(response.payload)
      expect($('#geneticDamEarTagNumber').val()).toBe('')
      expect($('#surrogateDamEarTagNumber').val()).toBe('')
    })

    test('it sends the user to dam details for a calf born via a genetic dam', async () => {
      // Arrange
      const registrationId = await registration({ damType: 'genetic' })
      const saveSurrogateDam = vi.spyOn(registrationClient, 'saveSurrogateDam')

      // Act
      const response = await post(
        surrogateDamPath(registrationId),
        surrogateDamPayload
      )

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(
        calfOnePath(registrationId, 'dam-details')
      )
      expect(saveSurrogateDam).not.toHaveBeenCalled()
    })

    test('it sends the user to calf details when the calf expires as the answers are sent', async () => {
      // Arrange
      const registrationId = await registration()
      vi.spyOn(registrationClient, 'saveSurrogateDam').mockResolvedValueOnce(
        null
      )

      // Act
      const response = await post(
        surrogateDamPath(registrationId),
        surrogateDamPayload
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
        damDetails: { damType: 'surrogate' },
        geneticDam: {},
        surrogateDam: {}
      })
      vi.spyOn(registrationClient, 'saveSurrogateDam').mockResolvedValueOnce(
        null
      )

      // Act
      const response = await post(
        surrogateDamPath(registrationId, 2),
        surrogateDamPayload
      )

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
    })

    test('it returns not found for a CPH the user is not granted', async () => {
      // Arrange
      const registrationId = await registration()
      const saveSurrogateDam = vi.spyOn(registrationClient, 'saveSurrogateDam')

      // Act
      const response = await post(
        surrogateDamPath(registrationId),
        surrogateDamPayload,
        spokeAuth(createUser(['22/002/0002']))
      )

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
      expect(saveSurrogateDam).not.toHaveBeenCalled()
    })

    test('it returns bad request for an answer longer than the field limit', async () => {
      // Arrange
      const registrationId = await registration()

      // Act
      const response = await post(surrogateDamPath(registrationId), {
        ...surrogateDamPayload,
        surrogateDamEarTagNumber: 'U'.repeat(201)
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.badRequest)
    })

    test('it rejects a post with no CSRF token', async () => {
      // Arrange
      const registrationId = await registration()
      const saveSurrogateDam = vi.spyOn(registrationClient, 'saveSurrogateDam')

      // Act
      const response = await server.inject({
        method: 'POST',
        url: surrogateDamPath(registrationId),
        auth: keeperAuth,
        headers: csrfHeaders,
        payload: surrogateDamPayload
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.forbidden)
      expect(saveSurrogateDam).not.toHaveBeenCalled()
    })
  })
})
