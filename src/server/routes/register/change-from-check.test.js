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

import {
  REGISTER_PATH,
  calfDetailsPayload,
  calfPath,
  damPayloads,
  keeperAuth,
  postForm,
  sireDetailsPayload,
  startRegistration
} from '#test-helpers/calf-registration.js'
import { createServer } from '#server/server.js'
import { registrationClient } from '#server/services/registration-client.js'

const NOW = new Date('2026-11-05T10:00:00Z')
const RETURN = '?return=check'

/**
 * @param {string} registrationId
 * @param {string} page
 * @returns {string} the path of a page of calf 1, calf details included
 */
function pagePath(registrationId, page) {
  return page === 'calf-details'
    ? `${REGISTER_PATH}/${registrationId}/calf-details`
    : calfPath(registrationId, page)
}

const changeablePages = [
  ['calf-details', 'genetic', calfDetailsPayload],
  ['dam-details', 'genetic', { damType: 'genetic' }],
  ['genetic-dam', 'genetic', damPayloads['genetic-dam']],
  ['surrogate-dam', 'surrogate', damPayloads['surrogate-dam']],
  ['sire-details', 'genetic', sireDetailsPayload]
]

describe('changing an answer from check calf details', () => {
  let server

  /**
   * @param {string} url
   * @returns {Promise<object>} the response to a GET of the page
   */
  function get(url) {
    return server.inject({ method: 'GET', url, auth: keeperAuth })
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

  test.each(changeablePages)(
    '%s reached from a Change link posts back with the return and links back to the check page',
    async (page, damType) => {
      // Arrange
      const registrationId = await startRegistration(server, { damType })

      // Act
      const response = await get(`${pagePath(registrationId, page)}${RETURN}`)

      // Assert
      expect(response.statusCode).toBe(statusCodes.ok)
      const $ = load(response.payload)
      expect($('main form').attr('action')).toBe(
        `${pagePath(registrationId, page)}${RETURN}`
      )
      expect($('.govuk-back-link').attr('href')).toBe(
        calfPath(registrationId, 'check-calf-details')
      )
    }
  )

  test.each(changeablePages)(
    '%s saved after a Change link returns to the check page',
    async (page, damType, payload) => {
      // Arrange
      const registrationId = await startRegistration(server, { damType })

      // Act
      const response = await postForm(
        server,
        `${pagePath(registrationId, page)}${RETURN}`,
        payload
      )

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(
        calfPath(registrationId, 'check-calf-details')
      )
    }
  )

  test('a changed answer is shown on the check page', async () => {
    // Arrange
    const registrationId = await startRegistration(server)
    await postForm(
      server,
      `${pagePath(registrationId, 'calf-details')}${RETURN}`,
      {
        ...calfDetailsPayload,
        sex: 'male'
      }
    )

    // Act
    const response = await get(calfPath(registrationId, 'check-calf-details'))

    // Assert
    const $ = load(response.payload)
    expect($('.govuk-summary-list__value').eq(2).text().trim()).toBe('Male')
  })

  test.each([
    ['genetic', 'surrogate'],
    ['surrogate', 'genetic']
  ])(
    'changing the dam type from %s to %s continues to the new dam page, then returns',
    async (damType, newDamType) => {
      // Arrange
      const registrationId = await startRegistration(server, { damType })
      const newDamPage = `${newDamType}-dam`

      // Act
      const damTypeResponse = await postForm(
        server,
        `${calfPath(registrationId, 'dam-details')}${RETURN}`,
        { damType: newDamType }
      )
      const damResponse = await postForm(
        server,
        damTypeResponse.headers.location,
        damPayloads[newDamPage]
      )

      // Assert
      expect(damTypeResponse.statusCode).toBe(302)
      expect(damTypeResponse.headers.location).toBe(
        `${calfPath(registrationId, newDamPage)}${RETURN}`
      )
      expect(damResponse.statusCode).toBe(302)
      expect(damResponse.headers.location).toBe(
        calfPath(registrationId, 'check-calf-details')
      )
    }
  )

  test('an error after a Change link keeps the return on the form', async () => {
    // Arrange
    const registrationId = await startRegistration(server)
    const url = `${calfPath(registrationId, 'genetic-dam')}${RETURN}`

    // Act
    const response = await postForm(server, url, { earTagNumber: '' })

    // Assert
    expect(response.statusCode).toBe(statusCodes.badRequest)
    expect(load(response.payload)('main form').attr('action')).toBe(url)
  })

  test('it returns to the check page when the calf expires as it is saved', async () => {
    // Arrange
    const registrationId = await startRegistration(server)
    vi.spyOn(registrationClient, 'getCalf').mockResolvedValueOnce(null)

    // Act
    const response = await postForm(
      server,
      `${pagePath(registrationId, 'calf-details')}${RETURN}`,
      calfDetailsPayload
    )

    // Assert
    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(
      calfPath(registrationId, 'check-calf-details')
    )
  })

  test.each(['https://example.com', 'tag-list', ''])(
    'it returns not found for a return of "%s"',
    async (returnTo) => {
      // Arrange
      const registrationId = await startRegistration(server)
      const url = `${calfPath(registrationId, 'sire-details')}?return=${encodeURIComponent(returnTo)}`

      // Act
      const getResponse = await get(url)
      const postResponse = await postForm(server, url, sireDetailsPayload)

      // Assert
      expect(getResponse.statusCode).toBe(statusCodes.notFound)
      expect(postResponse.statusCode).toBe(statusCodes.notFound)
    }
  )

  test('it ignores other query parameters', async () => {
    // Arrange
    const registrationId = await startRegistration(server)

    // Act
    const response = await get(
      `${calfPath(registrationId, 'sire-details')}?utm_source=email`
    )

    // Assert
    expect(response.statusCode).toBe(statusCodes.ok)
    expect(load(response.payload)('main form').attr('action')).toBe(
      calfPath(registrationId, 'sire-details')
    )
  })
})
