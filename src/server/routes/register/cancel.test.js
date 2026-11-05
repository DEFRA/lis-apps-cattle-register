import { randomUUID } from 'node:crypto'

import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import { load } from 'cheerio'

import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'

import { spokeAuth } from '#test-helpers/spoke-auth.js'
import {
  CPH,
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
      expect($('#earTagNumber').text().trim()).toBe('UK 123456 301550')
      expect($('.govuk-back-link').attr('href')).toBe(
        calfPath(registrationId, 'check-calf-details')
      )
      expect($('main form').attr('action')).toBe(
        calfPath(registrationId, 'cancel')
      )
      expect($('main form').attr('method')).toBe('post')
      expect($('main form button').text().trim()).toBe('Yes')
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
      expect($('#earTagNumber').text().trim()).toBe('UK 123456 301552')
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

    test('it returns not found for a registration there is not', async () => {
      // Arrange
      const registrationId = randomUUID()

      // Act
      const response = await get(calfPath(registrationId, 'cancel'))

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
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
