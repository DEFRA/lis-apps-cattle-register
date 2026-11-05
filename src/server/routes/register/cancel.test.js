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
  CPH,
  REGISTER_PATH,
  addCalf,
  calfPath,
  createUser,
  keeperAuth,
  startRegistration
} from '#test-helpers/calf-registration.js'
import { createServer } from '#server/server.js'
import { registrationClient } from '#server/services/registration-client.js'

const NOW = new Date('2026-11-05T10:00:00Z')

describe('cancel registration route', () => {
  let server

  /**
   * @param {string} url
   * @param {object} [auth]
   * @returns {Promise<object>}
   */
  function get(url, auth = keeperAuth) {
    return server.inject({ method: 'GET', url, auth })
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

  describe('GET cancel registration', () => {
    test('it asks to confirm cancelling the calf, showing its ear tag', async () => {
      // Arrange
      const registrationId = await startRegistration(server)

      // Act
      const response = await get(calfPath(registrationId, 'cancel'))

      // Assert
      expect(response.statusCode).toBe(statusCodes.ok)
      const $ = load(response.payload)
      const heading = 'Are you sure you want to cancel this registration?'
      expect($('title').text().trim().startsWith(`${heading} - `)).toBe(true)
      expect($('h1').text().trim()).toBe(heading)
      expect($('h1')).toHaveLength(1)
      expect($('main .govuk-caption-l').text().trim()).toBe(
        'Official animal ear tag number: UK 123456 301550'
      )
      expect($('.govuk-back-link').attr('href')).toBe(
        calfPath(registrationId, 'check-calf-details')
      )
      expect($('main form').attr('action')).toBe(
        calfPath(registrationId, 'cancel')
      )
      expect($('main form').attr('method')).toBe('post')
      expect($('main form input[name="calfEarTagNumber"]').val()).toBe(
        'UK123456301550'
      )
      const yes = $('main form button')
      expect(yes.text().trim()).toBe('Yes')
      expect(yes.attr('data-prevent-double-click')).toBe('true')
      const keep = $('main form .govuk-button-group a')
      expect(keep.text().trim()).toBe('No')
      expect(keep.attr('href')).toBe(
        calfPath(registrationId, 'check-calf-details')
      )
      expect($('.govuk-error-summary')).toHaveLength(0)
    })

    test('it shows the ear tag of a later calf', async () => {
      // Arrange
      const registrationId = await startRegistration(server)
      await addCalf(server, registrationId, 2, {
        earTagNumber: 'UK123456301552'
      })

      // Act
      const response = await get(calfPath(registrationId, 'cancel', 2))

      // Assert
      const $ = load(response.payload)
      expect($('main .govuk-caption-l').text().trim()).toBe(
        'Official animal ear tag number: UK 123456 301552'
      )
      expect($('main form input[name="calfEarTagNumber"]').val()).toBe(
        'UK123456301552'
      )
      expect($('main form').attr('action')).toBe(
        calfPath(registrationId, 'cancel', 2)
      )
    })

    test('it removes nothing', async () => {
      // Arrange
      const registrationId = await startRegistration(server)

      // Act
      await get(calfPath(registrationId, 'cancel'))

      // Assert
      const calf = await registrationClient.getCalf({
        cph: CPH,
        registrationId,
        userId: 'test-user',
        calfNumber: 1
      })
      expect(calf).not.toBeNull()
    })

    test.each([
      ['a calf the registration does not have', 2],
      ['a malformed calf number', 'one'],
      ['calf 0', 0]
    ])('it returns not found for %s', async (_case, calfNumber) => {
      // Arrange
      const registrationId = await startRegistration(server)

      // Act
      const response = await get(calfPath(registrationId, 'cancel', calfNumber))

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
    })

    test.each([1, 2])(
      'it sends calf %s of a registration there is not to calf details',
      async (calfNumber) => {
        // Arrange
        const registrationId = randomUUID()

        // Act
        const response = await get(
          calfPath(registrationId, 'cancel', calfNumber)
        )

        // Assert
        expect(response.statusCode).toBe(302)
        expect(response.headers.location).toBe(
          `${REGISTER_PATH}/${registrationId}/calf-details`
        )
      }
    )

    test('it returns not found for a user without an id', async () => {
      // Arrange
      const registrationId = await startRegistration(server)
      const auth = spokeAuth({ ...createUser([CPH]), sub: undefined })
      const getCalf = vi.spyOn(registrationClient, 'getCalf')

      // Act
      const response = await get(calfPath(registrationId, 'cancel'), auth)

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
      expect(getCalf).not.toHaveBeenCalled()
    })

    test('it returns not found for a CPH the user is not granted', async () => {
      // Arrange
      const registrationId = await startRegistration(server)
      const auth = spokeAuth(createUser(['20/202/2020']))

      // Act
      const response = await get(calfPath(registrationId, 'cancel'), auth)

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
    })
  })
})
