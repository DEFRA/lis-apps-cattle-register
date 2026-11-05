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
import {
  REGISTER_PATH,
  addCalf,
  calfPath,
  createUser,
  csrfHeaders,
  keeperAuth,
  postForm,
  startRegistration
} from '#test-helpers/calf-registration.js'
import { createServer } from '#server/server.js'
import { registrationClient } from '#server/services/registration-client.js'

const NOW = new Date('2026-11-05T10:00:00Z')

describe('tag list submit route', () => {
  let server

  /**
   * @param {string} registrationId
   * @returns {string}
   */
  function tagListPath(registrationId) {
    return `${REGISTER_PATH}/${registrationId}/tag-list`
  }

  /**
   * @param {string} registrationId
   * @param {object} payload
   * @param {object} [auth]
   * @returns {Promise<object>}
   */
  function submit(registrationId, payload, auth = keeperAuth) {
    return postForm(server, tagListPath(registrationId), payload, auth)
  }

  /**
   * @returns {Promise<string>} a registration whose only calf is confirmed
   */
  async function confirmedRegistration() {
    const registrationId = await startRegistration(server)
    await postForm(server, calfPath(registrationId, 'check-calf-details'), {})

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

  describe('POST tag list', () => {
    test('it continues to calf details for the next calf when adding another', async () => {
      // Arrange
      const registrationId = await confirmedRegistration()
      await addCalf(server, registrationId, 2)

      // Act
      const response = await submit(registrationId, { addAnother: 'yes' })

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(
        calfPath(registrationId, 'calf-details', 3)
      )
    })

    test('it continues to submit once every calf is ready to send', async () => {
      // Arrange
      const registrationId = await confirmedRegistration()

      // Act
      const response = await submit(registrationId, { addAnother: 'no' })

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(
        `${REGISTER_PATH}/${registrationId}/submit`
      )
    })

    test.each([
      ['no answer', {}],
      ['an answer not offered', { addAnother: 'maybe' }]
    ])('it asks for an answer when given %s', async (_description, payload) => {
      // Arrange
      const registrationId = await confirmedRegistration()

      // Act
      const response = await submit(registrationId, payload)

      // Assert
      expect(response.statusCode).toBe(statusCodes.badRequest)
      const $ = load(response.payload)
      expect($('title').text().trim()).toMatch(
        /^Error: Register new cattle births - /
      )
      const message = 'Select yes to add additional animals or no to continue'
      expect($('.govuk-error-summary a').text().trim()).toBe(message)
      expect($('.govuk-error-summary a').attr('href')).toBe('#addAnother')
      expect($('#addAnother-error').text().trim()).toBe(`Error: ${message}`)
      expect($('#calves tbody tr')).toHaveLength(1)
    })

    test('it refuses to continue while a calf is not ready, linking to it', async () => {
      // Arrange
      const registrationId = await confirmedRegistration()
      await addCalf(server, registrationId, 2, { confirmed: false })

      // Act
      const response = await submit(registrationId, { addAnother: 'no' })

      // Assert
      expect(response.statusCode).toBe(statusCodes.badRequest)
      const $ = load(response.payload)
      expect($('.govuk-error-summary a').text().trim()).toBe(
        'Complete all required animal details before continuing'
      )
      expect($('.govuk-error-summary a').attr('href')).toBe('#calf-2')
      expect($('#calf-2').attr('href')).toBe(
        calfPath(registrationId, 'check-calf-details', 2)
      )
      expect($('.govuk-error-message')).toHaveLength(0)
      expect($('input[name="addAnother"][value="no"]').attr('checked')).toBe(
        'checked'
      )
    })

    test('it refuses another calf once the registration is full', async () => {
      // Arrange
      const registrationId = await confirmedRegistration()
      const registration = await registrationClient.getRegistration({
        cph: '10/081/1234',
        registrationId,
        userId: 'test-user'
      })
      vi.spyOn(registrationClient, 'getRegistration').mockResolvedValueOnce({
        ...registration,
        canAddCalf: false
      })

      // Act
      const response = await submit(registrationId, { addAnother: 'yes' })

      // Assert
      expect(response.statusCode).toBe(statusCodes.badRequest)
      const message =
        'You can add up to 50 animals to one registration. Select no to continue'
      const $ = load(response.payload)
      expect($('.govuk-error-summary a').text().trim()).toBe(message)
      expect($('#addAnother-error').text().trim()).toBe(`Error: ${message}`)
    })

    test('it sends a registration with no calves to calf details', async () => {
      // Arrange
      const registrationId = randomUUID()

      // Act
      const response = await submit(registrationId, { addAnother: 'yes' })

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(
        `${REGISTER_PATH}/${registrationId}/calf-details`
      )
    })

    test('it returns not found for a CPH the user is not granted', async () => {
      // Arrange
      const registrationId = await confirmedRegistration()
      const auth = spokeAuth(createUser(['20/202/2020']))

      // Act
      const response = await submit(registrationId, { addAnother: 'yes' }, auth)

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
    })

    test('it rejects a post with no CSRF token', async () => {
      // Arrange
      const registrationId = await confirmedRegistration()

      // Act
      const response = await server.inject({
        method: 'POST',
        url: tagListPath(registrationId),
        auth: keeperAuth,
        headers: { 'sec-fetch-site': csrfHeaders['sec-fetch-site'] },
        payload: { addAnother: 'yes' }
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.forbidden)
    })
  })
})
