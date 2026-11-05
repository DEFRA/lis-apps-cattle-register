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

describe('sire details routes', () => {
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
        { calfEarTagNumber: calfDetails.earTagNumber, damType }
      )
      expect(damResponse.statusCode).toBe(302)
    }

    if (damType && damSaved) {
      const page = `${damType}-dam`
      const damPageResponse = await post(calfOnePath(registrationId, page), {
        calfEarTagNumber: calfDetails.earTagNumber,
        ...damPayloads[page]
      })
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

  describe('GET sire details', () => {
    test('it renders the optional sire questions about the calf', async () => {
      // Arrange
      const registrationId = await registration()

      // Act
      const response = await get(registrationId)

      // Assert
      expect(response.statusCode).toBe(statusCodes.ok)
      const $ = load(response.payload)
      expect($('title').text().trim()).toMatch(/^Sire details - /)
      expect($('h1').text().trim()).toBe('Sire details')
      expect($('main .govuk-caption-l').text().trim()).toBe(
        'Official animal ear tag number: UK 123456 301550'
      )
      expect($('#sireEarTagNumber').attr('maxlength')).toBe('200')
      expect($('#sireName').attr('maxlength')).toBe('200')
      expect($('main form').attr('action')).toBe(
        sireDetailsPath(registrationId)
      )
      expect($('main form').attr('method')).toBe('post')
      expect($('.govuk-error-summary')).toHaveLength(0)
      expect($('label[for="sireEarTagNumber"]').text().trim()).toBe(
        'Sire ear tag number (optional)'
      )
      expect($('#sireEarTagNumber-hint').text().trim()).toBe(EAR_TAG_HINT)
      expect($('#sireEarTagNumber').attr('aria-describedby')).toBe(
        'sireEarTagNumber-hint'
      )
      expect($('label[for="sireName"]').text().trim()).toBe(
        'Sire name (optional)'
      )
      expect($('#sireEarTagNumber').val()).toBe('')
      expect($('#sireName').val()).toBe('')
      expect($('main form button').text().trim()).toBe('Continue')
    })

    test.each([
      ['genetic', 'genetic-dam'],
      ['surrogate', 'surrogate-dam']
    ])(
      'it links back to the %s dam page the user completed',
      async (damType, page) => {
        // Arrange
        const registrationId = await registration({ damType })

        // Act
        const response = await get(registrationId)

        // Assert
        expect(response.statusCode).toBe(statusCodes.ok)
        const $ = load(response.payload)
        expect($('.govuk-back-link').attr('href')).toBe(
          calfOnePath(registrationId, page)
        )
      }
    )

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
      await post(sireDetailsPath(registrationId), sireDetailsPayload)

      // Act
      const response = await get(registrationId)

      // Assert
      const $ = load(response.payload)
      expect($('#sireEarTagNumber').val()).toBe('UK123456701300')
      expect($('#sireName').val()).toBe('Big Bob')
    })

    test.each([
      ['dam details is not answered', { damType: null }, 'dam-details'],
      [
        'genetic dam details is not saved',
        { damType: 'genetic', damSaved: false },
        'genetic-dam'
      ],
      [
        'surrogate dam details is not saved',
        { damType: 'surrogate', damSaved: false },
        'surrogate-dam'
      ]
    ])(
      'it sends the user to the first unfinished dam page when %s',
      async (_description, options, page) => {
        // Arrange
        const registrationId = await registration(options)

        // Act
        const response = await get(registrationId)

        // Assert
        expect(response.statusCode).toBe(302)
        expect(response.headers.location).toBe(
          calfOnePath(registrationId, page)
        )
      }
    )

    test('it sends the user to the new dam page when the dam type changes', async () => {
      // Arrange
      const registrationId = await registration({ damType: 'genetic' })
      await post(calfOnePath(registrationId, 'dam-details'), {
        damType: 'surrogate'
      })

      // Act
      const response = await get(registrationId)

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(
        calfOnePath(registrationId, 'surrogate-dam')
      )
    })

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
        url: sireDetailsPath(registrationId),
        auth: spokeAuth(user)
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
      expect(getCalf).not.toHaveBeenCalled()
    })
  })
})
