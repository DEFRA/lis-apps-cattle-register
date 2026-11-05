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
const OTHER_CPH = '22/002/0002'

describe('cancel registration submit route', () => {
  let server

  /**
   * @param {string} url
   * @param {object} [auth]
   * @param {object} [payload] - see postForm()
   * @returns {Promise<object>} the response to confirming the cancel
   */
  function cancel(url, auth = keeperAuth, payload = {}) {
    return postForm(server, url, payload, auth)
  }

  /**
   * @param {string} registrationId
   * @returns {Promise<string[] | undefined>} the ear tags of the calves
   *   held for the test user on the test holding
   */
  async function earTags(registrationId) {
    const registration = await registrationClient.getRegistration({
      cph: CPH,
      registrationId,
      userId: 'test-user'
    })

    return registration?.calves.map((calf) => calf.calfDetails.earTagNumber)
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

  describe('POST cancel registration', () => {
    test('it removes the calf and continues to the list of calves', async () => {
      // Arrange
      const registrationId = await startRegistration(server)
      const removeCalf = vi.spyOn(registrationClient, 'removeCalf')

      // Act
      const response = await cancel(calfPath(registrationId, 'cancel'))

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(
        `${REGISTER_PATH}/${registrationId}/tag-list`
      )
      expect(removeCalf).toHaveBeenCalledWith({
        cph: CPH,
        registrationId,
        userId: 'test-user',
        calfNumber: 1
      })
      expect(await earTags(registrationId)).toEqual([])
    })

    test('it keeps the other calves, moving later ones up a place', async () => {
      // Arrange
      const registrationId = await startRegistration(server)
      await addCalf(server, registrationId, 2, {
        earTagNumber: 'UK123456301552'
      })

      // Act
      await cancel(calfPath(registrationId, 'cancel', 1))

      // Assert
      expect(await earTags(registrationId)).toEqual(['UK123456301552'])
    })

    test.each([
      ['already cancelled', true],
      ['there is not', false]
    ])(
      'it ends at the list of calves for a calf %s',
      async (_case, started) => {
        // Arrange
        const registrationId = started
          ? await startRegistration(server)
          : randomUUID()
        const url = calfPath(registrationId, 'cancel')
        if (started) {
          await cancel(url)
        }

        // Act
        const response = await cancel(url)

        // Assert
        expect(response.statusCode).toBe(302)
        expect(response.headers.location).toBe(
          `${REGISTER_PATH}/${registrationId}/tag-list`
        )
      }
    )

    test('a cancelled calf is gone from its pages', async () => {
      // Arrange
      const registrationId = await startRegistration(server)
      await addCalf(server, registrationId, 2)
      await cancel(calfPath(registrationId, 'cancel', 2), keeperAuth, {
        calfEarTagNumber: 'UK123456301552'
      })

      // Act
      const response = await server.inject({
        method: 'GET',
        url: calfPath(registrationId, 'check-calf-details', 2),
        auth: keeperAuth
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
    })

    test('a cancelled only calf sends its pages back to calf details', async () => {
      // Arrange
      const registrationId = await startRegistration(server)
      await cancel(calfPath(registrationId, 'cancel'))

      // Act
      const response = await server.inject({
        method: 'GET',
        url: calfPath(registrationId, 'check-calf-details'),
        auth: keeperAuth
      })

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(
        `${REGISTER_PATH}/${registrationId}/calf-details`
      )
    })

    test("it does not remove another user's calf", async () => {
      // Arrange
      const registrationId = await startRegistration(server)
      const auth = spokeAuth({ ...createUser([CPH]), sub: 'another-user' })

      // Act
      const response = await cancel(calfPath(registrationId, 'cancel'), auth)

      // Assert
      expect(response.statusCode).toBe(302)
      expect(await earTags(registrationId)).toEqual(['UK123456301550'])
    })

    test("it does not remove the calf through another holding's address", async () => {
      // Arrange
      const registrationId = await startRegistration(server)
      const auth = spokeAuth(createUser([CPH, OTHER_CPH]))
      const url = `/holdings/${OTHER_CPH}/cattle/register/${registrationId}/calves/1/cancel`

      // Act
      const response = await cancel(url, auth)

      // Assert
      expect(response.statusCode).toBe(302)
      expect(await earTags(registrationId)).toEqual(['UK123456301550'])
    })

    test('it returns not found for a CPH the user is not granted', async () => {
      // Arrange
      const registrationId = await startRegistration(server)
      const removeCalf = vi.spyOn(registrationClient, 'removeCalf')

      // Act
      const response = await cancel(
        calfPath(registrationId, 'cancel'),
        spokeAuth(createUser(['20/202/2020']))
      )

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
      expect(removeCalf).not.toHaveBeenCalled()
    })

    test('it does not remove the calf for a user without an id', async () => {
      // Arrange
      const registrationId = await startRegistration(server)
      const auth = spokeAuth({ ...createUser([CPH]), sub: undefined })
      const removeCalf = vi.spyOn(registrationClient, 'removeCalf')

      // Act
      const response = await cancel(calfPath(registrationId, 'cancel'), auth)

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
      expect(removeCalf).not.toHaveBeenCalled()
      expect(await earTags(registrationId)).toEqual(['UK123456301550'])
    })

    test('it rejects a post with no CSRF token', async () => {
      // Arrange
      const registrationId = await startRegistration(server)

      // Act
      const response = await server.inject({
        method: 'POST',
        url: calfPath(registrationId, 'cancel'),
        auth: keeperAuth,
        headers: csrfHeaders
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.forbidden)
      expect(await earTags(registrationId)).toEqual(['UK123456301550'])
    })
  })
})
