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
const EAR_TAG_MESSAGE = 'Enter the animal ear tag number of the genetic dam'

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
function geneticDamPath(registrationId, calfNumber = 1) {
  return `${REGISTER_PATH}/${registrationId}/calves/${calfNumber}/genetic-dam`
}

describe('genetic dam routes', () => {
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
    damType = 'genetic',
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
        `${REGISTER_PATH}/${registrationId}/calves/1/dam-details`,
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

  describe('GET genetic dam', () => {
    test('it renders the question about the calf', async () => {
      // Arrange
      const registrationId = await registration()

      // Act
      const response = await server.inject({
        method: 'GET',
        url: geneticDamPath(registrationId),
        auth: keeperAuth
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.ok)
      const $ = load(response.payload)
      expect($('title').text().trim()).toMatch(/^Genetic dam details - /)
      expect($('h1').text().trim()).toBe('Genetic dam details')
      expect($('main .govuk-caption-l').text().trim()).toBe(
        'Official animal ear tag number: UK123456301550'
      )
      expect($('.govuk-back-link').attr('href')).toBe(
        `${REGISTER_PATH}/${registrationId}/calves/1/dam-details`
      )
      expect($('main form').attr('action')).toBe(geneticDamPath(registrationId))
      expect($('main form').attr('method')).toBe('post')
      expect($('.govuk-error-summary')).toHaveLength(0)
      expect($('label[for="earTagNumber"]').text().trim()).toBe(
        'Animal ear tag number'
      )
      expect($('#earTagNumber-hint').text().trim()).toBe(
        'Enter the full animal ear tag number. For example, UK123456123456'
      )
      expect($('#earTagNumber').attr('aria-describedby')).toBe(
        'earTagNumber-hint'
      )
      expect($('#earTagNumber').val()).toBe('')
      expect($('main form button').text().trim()).toBe('Continue')
    })

    test('it escapes the calf ear tag number', async () => {
      // Arrange
      const registrationId = await registration({
        calfDetails: { ...calfDetailsPayload, earTagNumber: '<b>UK1</b>' }
      })

      // Act
      const response = await server.inject({
        method: 'GET',
        url: geneticDamPath(registrationId),
        auth: keeperAuth
      })

      // Assert
      const $ = load(response.payload)
      expect($('main b')).toHaveLength(0)
      expect($('main .govuk-caption-l').text().trim()).toBe(
        'Official animal ear tag number: <b>UK1</b>'
      )
    })

    test('it shows the saved answer', async () => {
      // Arrange
      const registrationId = await registration()
      await post(geneticDamPath(registrationId), {
        earTagNumber: 'UK123456501100'
      })

      // Act
      const response = await server.inject({
        method: 'GET',
        url: geneticDamPath(registrationId),
        auth: keeperAuth
      })

      // Assert
      const $ = load(response.payload)
      expect($('#earTagNumber').val()).toBe('UK123456501100')
    })

    test.each([
      ['dam details is not answered', null],
      ['the calf was born via a surrogate dam', 'surrogate']
    ])(
      'it sends the user to dam details when %s',
      async (_description, damType) => {
        // Arrange
        const registrationId = await registration({ damType })

        // Act
        const response = await server.inject({
          method: 'GET',
          url: geneticDamPath(registrationId),
          auth: keeperAuth
        })

        // Assert
        expect(response.statusCode).toBe(302)
        expect(response.headers.location).toBe(
          `${REGISTER_PATH}/${registrationId}/calves/1/dam-details`
        )
      }
    )

    test('it sends the user to calf details before calf details is saved', async () => {
      // Arrange
      const registrationId = randomUUID()

      // Act
      const response = await server.inject({
        method: 'GET',
        url: geneticDamPath(registrationId),
        auth: keeperAuth
      })

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(
        `${REGISTER_PATH}/${registrationId}/calf-details`
      )
    })

    test('it returns not found for a calf the registration does not have', async () => {
      // Arrange
      const registrationId = await registration()

      // Act
      const response = await server.inject({
        method: 'GET',
        url: geneticDamPath(registrationId, 2),
        auth: keeperAuth
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
    })

    test.each([
      ['zero', '0'],
      ['more than three digits', '1000'],
      ['not a number', 'one']
    ])(
      'it returns not found for a calf number that is %s',
      async (_description, calfNumber) => {
        // Arrange
        const registrationId = await registration()

        // Act
        const response = await server.inject({
          method: 'GET',
          url: geneticDamPath(registrationId, calfNumber),
          auth: keeperAuth
        })

        // Assert
        expect(response.statusCode).toBe(statusCodes.notFound)
      }
    )

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
        url: geneticDamPath(registrationId),
        auth: spokeAuth(user)
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
      expect(getCalf).not.toHaveBeenCalled()
    })
  })

  describe('POST genetic dam', () => {
    test('it saves the genetic dam and continues to sire details', async () => {
      // Arrange
      const registrationId = await registration()
      const saveGeneticDam = vi.spyOn(registrationClient, 'saveGeneticDam')

      // Act
      const response = await post(geneticDamPath(registrationId), {
        earTagNumber: 'UK123456501100',
        unexpected: 'ignored'
      })

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(
        `${REGISTER_PATH}/${registrationId}/calves/1/sire-details`
      )
      expect(saveGeneticDam).toHaveBeenCalledWith({
        cph: CPH,
        registrationId,
        userId: 'test-user',
        calfNumber: 1,
        answers: { earTagNumber: 'UK123456501100' }
      })
    })

    test.each([
      ['no answer', {}],
      ['a blank answer', { earTagNumber: '' }],
      ['a whitespace-only answer', { earTagNumber: '   ' }]
    ])('it shows the error for %s', async (_description, payload) => {
      // Arrange
      const registrationId = await registration()

      // Act
      const response = await post(geneticDamPath(registrationId), payload)

      // Assert
      expect(response.statusCode).toBe(statusCodes.badRequest)
      const $ = load(response.payload)
      expect($('title').text().trim()).toMatch(/^Error: Genetic dam details - /)
      expect($('.govuk-error-summary__title').text().trim()).toBe(
        'There is a problem'
      )
      expect($('.govuk-error-summary__list a').text().trim()).toBe(
        EAR_TAG_MESSAGE
      )
      expect($('.govuk-error-summary__list a').attr('href')).toBe(
        '#earTagNumber'
      )
      expect($('#earTagNumber-error').text().trim()).toBe(
        `Error: ${EAR_TAG_MESSAGE}`
      )
      expect($('#earTagNumber').attr('aria-describedby')).toBe(
        'earTagNumber-hint earTagNumber-error'
      )
      expect($('main .govuk-caption-l').text().trim()).toBe(
        'Official animal ear tag number: UK123456301550'
      )
    })

    test('it keeps the saved answer when a later post has errors', async () => {
      // Arrange
      const registrationId = await registration()
      await post(geneticDamPath(registrationId), {
        earTagNumber: 'UK123456501100'
      })
      await post(geneticDamPath(registrationId), { earTagNumber: '' })

      // Act
      const response = await server.inject({
        method: 'GET',
        url: geneticDamPath(registrationId),
        auth: keeperAuth
      })

      // Assert
      const $ = load(response.payload)
      expect($('#earTagNumber').val()).toBe('UK123456501100')
    })

    test('it discards the genetic dam when dam details changes to surrogate', async () => {
      // Arrange
      const registrationId = await registration()
      await post(geneticDamPath(registrationId), {
        earTagNumber: 'UK123456501100'
      })
      await post(`${REGISTER_PATH}/${registrationId}/calves/1/dam-details`, {
        damType: 'surrogate'
      })
      await post(`${REGISTER_PATH}/${registrationId}/calves/1/dam-details`, {
        damType: 'genetic'
      })

      // Act
      const response = await server.inject({
        method: 'GET',
        url: geneticDamPath(registrationId),
        auth: keeperAuth
      })

      // Assert
      const $ = load(response.payload)
      expect($('#earTagNumber').val()).toBe('')
    })

    test('it sends the user to dam details for a calf born via a surrogate dam', async () => {
      // Arrange
      const registrationId = await registration({ damType: 'surrogate' })
      const saveGeneticDam = vi.spyOn(registrationClient, 'saveGeneticDam')

      // Act
      const response = await post(geneticDamPath(registrationId), {
        earTagNumber: 'UK123456501100'
      })

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(
        `${REGISTER_PATH}/${registrationId}/calves/1/dam-details`
      )
      expect(saveGeneticDam).not.toHaveBeenCalled()
    })

    test('it returns not found for a calf the registration does not have', async () => {
      // Arrange
      const registrationId = await registration()

      // Act
      const response = await post(geneticDamPath(registrationId, 2), {
        earTagNumber: 'UK123456501100'
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
    })

    test('it returns not found for a CPH the user is not granted', async () => {
      // Arrange
      const registrationId = await registration()
      const saveGeneticDam = vi.spyOn(registrationClient, 'saveGeneticDam')

      // Act
      const response = await post(
        geneticDamPath(registrationId),
        { earTagNumber: 'UK123456501100' },
        spokeAuth(createUser(['22/002/0002']))
      )

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
      expect(saveGeneticDam).not.toHaveBeenCalled()
    })

    test('it returns bad request for an answer longer than the field limit', async () => {
      // Arrange
      const registrationId = await registration()

      // Act
      const response = await post(geneticDamPath(registrationId), {
        earTagNumber: 'U'.repeat(201)
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.badRequest)
    })

    test('it rejects a post with no CSRF token', async () => {
      // Arrange
      const registrationId = await registration()
      const saveGeneticDam = vi.spyOn(registrationClient, 'saveGeneticDam')

      // Act
      const response = await server.inject({
        method: 'POST',
        url: geneticDamPath(registrationId),
        auth: keeperAuth,
        headers: csrfHeaders,
        payload: { earTagNumber: 'UK123456501100' }
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.forbidden)
      expect(saveGeneticDam).not.toHaveBeenCalled()
    })
  })
})
