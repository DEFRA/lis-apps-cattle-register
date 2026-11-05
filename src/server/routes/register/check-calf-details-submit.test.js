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

import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'

import { spokeAuth } from '#test-helpers/spoke-auth.js'
import {
  CPH,
  REGISTER_PATH,
  calfDetailsPayload,
  calfPath,
  createUser,
  csrfHeaders,
  damPayloads,
  keeperAuth,
  postForm,
  startRegistration
} from '#test-helpers/calf-registration.js'
import { createServer } from '#server/server.js'
import { registrationClient } from '#server/services/registration-client.js'

const NOW = new Date('2026-11-05T10:00:00Z')

describe('check calf details submit route', () => {
  let server

  /**
   * @param {string} registrationId
   * @param {object} [options]
   * @param {number|string} [options.calfNumber]
   * @param {object} [options.auth]
   * @returns {Promise<object>} the response to confirming the calf
   */
  function confirm(registrationId, { calfNumber = 1, auth = keeperAuth } = {}) {
    return postForm(
      server,
      calfPath(registrationId, 'check-calf-details', calfNumber),
      {},
      auth
    )
  }

  /**
   * @param {string} registrationId
   * @returns {Promise<object | null>} calf 1 as saved
   */
  function savedCalf(registrationId) {
    return registrationClient.getCalf({
      cph: CPH,
      registrationId,
      userId: 'test-user',
      calfNumber: 1
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

  describe('POST check calf details', () => {
    test('it marks the calf as checked and continues to the list of calves', async () => {
      // Arrange
      const registrationId = await startRegistration(server)
      const confirmCalf = vi.spyOn(registrationClient, 'confirmCalf')

      // Act
      const response = await confirm(registrationId)

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(
        `${REGISTER_PATH}/${registrationId}/tag-list`
      )
      expect(confirmCalf).toHaveBeenCalledWith({
        cph: CPH,
        registrationId,
        userId: 'test-user',
        calfNumber: 1
      })
      expect((await savedCalf(registrationId)).checked).toBe(true)
    })

    test('it sends the user to the first unfinished page, confirming nothing', async () => {
      // Arrange
      const registrationId = await startRegistration(server, {
        sireDetails: null
      })
      const confirmCalf = vi.spyOn(registrationClient, 'confirmCalf')

      // Act
      const response = await confirm(registrationId)

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(
        calfPath(registrationId, 'sire-details')
      )
      expect(confirmCalf).not.toHaveBeenCalled()
    })

    test('it sends the user to calf details when the calf expires as the page is sent', async () => {
      // Arrange
      const registrationId = await startRegistration(server)
      vi.spyOn(registrationClient, 'confirmCalf').mockResolvedValueOnce(null)

      // Act
      const response = await confirm(registrationId)

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(
        `${REGISTER_PATH}/${registrationId}/calf-details`
      )
    })

    test('it returns not found for a later calf that expires as the page is sent', async () => {
      // Arrange
      const registrationId = randomUUID()
      vi.spyOn(registrationClient, 'getCalf').mockResolvedValueOnce({
        calfDetails: calfDetailsPayload,
        damDetails: { damType: 'genetic' },
        geneticDam: damPayloads['genetic-dam'],
        surrogateDam: {},
        sireDetails: { sireEarTagNumber: '', sireName: '' },
        checked: false
      })
      vi.spyOn(registrationClient, 'confirmCalf').mockResolvedValueOnce(null)

      // Act
      const response = await confirm(registrationId, { calfNumber: 2 })

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
    })

    test('it returns not found for a CPH the user is not granted', async () => {
      // Arrange
      const registrationId = await startRegistration(server)
      const confirmCalf = vi.spyOn(registrationClient, 'confirmCalf')

      // Act
      const response = await confirm(registrationId, {
        auth: spokeAuth(createUser(['22/002/0002']))
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
      expect(confirmCalf).not.toHaveBeenCalled()
    })

    test('it rejects a post with no CSRF token', async () => {
      // Arrange
      const registrationId = await startRegistration(server)
      const confirmCalf = vi.spyOn(registrationClient, 'confirmCalf')

      // Act
      const response = await server.inject({
        method: 'POST',
        url: calfPath(registrationId, 'check-calf-details'),
        auth: keeperAuth,
        headers: csrfHeaders
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.forbidden)
      expect(confirmCalf).not.toHaveBeenCalled()
      expect((await savedCalf(registrationId)).checked).toBe(false)
    })
  })
})
