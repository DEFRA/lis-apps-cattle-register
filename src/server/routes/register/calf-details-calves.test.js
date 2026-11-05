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
  calfDetailsPayload,
  calfPath,
  createUser,
  keeperAuth,
  postForm,
  startRegistration
} from '#test-helpers/calf-registration.js'
import { createServer } from '#server/server.js'
import { registrationClient } from '#server/services/registration-client.js'

const NOW = new Date('2026-11-05T10:00:00Z')
const DUPLICATE_MESSAGE =
  'This animal ear tag number has already been added to this registration'

describe('calf details for each calf', () => {
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

  describe('GET calf details', () => {
    test('it renders a blank form for the next calf, back to the list of calves', async () => {
      // Arrange
      const registrationId = await startRegistration(server)

      // Act
      const response = await get(calfPath(registrationId, 'calf-details', 2))

      // Assert
      expect(response.statusCode).toBe(statusCodes.ok)
      const $ = load(response.payload)
      expect($('h1').text().trim()).toBe('Calf details')
      expect($('#earTagNumber').val()).toBe('')
      expect($('.govuk-back-link').attr('href')).toBe(
        `${REGISTER_PATH}/${registrationId}/tag-list`
      )
      expect($('main form').attr('action')).toBe(
        calfPath(registrationId, 'calf-details', 2)
      )
    })

    test('it shows the saved answers of a later calf', async () => {
      // Arrange
      const registrationId = await startRegistration(server)
      await addCalf(server, registrationId, 2, { complete: false })

      // Act
      const response = await get(calfPath(registrationId, 'calf-details', 2))

      // Assert
      expect(load(response.payload)('#earTagNumber').val()).toBe(
        'UK123456301552'
      )
    })

    test('it shows a saved calf 1 at its per-calf address, back to the list of calves', async () => {
      // Arrange
      const registrationId = await startRegistration(server)

      // Act
      const response = await get(calfPath(registrationId, 'calf-details'))

      // Assert
      const $ = load(response.payload)
      expect($('#earTagNumber').val()).toBe(calfDetailsPayload.earTagNumber)
      expect($('input[name="calfEarTagNumber"]').val()).toBe(
        calfDetailsPayload.earTagNumber
      )
      expect($('.govuk-back-link').attr('href')).toBe(
        `${REGISTER_PATH}/${registrationId}/tag-list`
      )
    })

    test('it shows calf 1 back to the list of calves once every calf is cancelled', async () => {
      // Arrange
      const registrationId = await startRegistration(server)
      await postForm(server, calfPath(registrationId, 'cancel'), {})

      // Act
      const response = await get(calfPath(registrationId, 'calf-details'))

      // Assert
      const $ = load(response.payload)
      expect($('#earTagNumber').val()).toBe('')
      expect($('.govuk-back-link').attr('href')).toBe(
        `${REGISTER_PATH}/${registrationId}/tag-list`
      )
    })

    test('it shows calf 1 of a registration not started back to the holding', async () => {
      // Arrange
      const registrationId = randomUUID()

      // Act
      const response = await get(calfPath(registrationId, 'calf-details'))

      // Assert
      const $ = load(response.payload)
      expect($('#earTagNumber').val()).toBe('')
      expect($('input[name="calfEarTagNumber"]').val()).toBe('')
      expect($('.govuk-back-link').attr('href')).toBe(`/holdings/${CPH}/cattle`)
    })

    test.each([
      ['a calf after the next one', 3],
      ['calf 0', 0],
      ['a calf number past 999', 1000]
    ])('it returns not found for %s', async (_description, calfNumber) => {
      // Arrange
      const registrationId = await startRegistration(server)

      // Act
      const response = await get(
        calfPath(registrationId, 'calf-details', calfNumber)
      )

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
    })

    test('it sends calf 2 of a registration there is not to calf details', async () => {
      // Arrange
      const registrationId = randomUUID()

      // Act
      const response = await get(calfPath(registrationId, 'calf-details', 2))

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(
        `${REGISTER_PATH}/${registrationId}/calf-details`
      )
    })

    test('it returns not found for a CPH the user is not granted', async () => {
      // Arrange
      const registrationId = await startRegistration(server)
      const auth = spokeAuth(createUser(['20/202/2020']))

      // Act
      const response = await get(
        calfPath(registrationId, 'calf-details', 2),
        auth
      )

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
    })
  })

  describe('POST calf details', () => {
    test('it saves the next calf and continues to its dam details', async () => {
      // Arrange
      const registrationId = await startRegistration(server)
      const payload = { ...calfDetailsPayload, earTagNumber: 'UK123456301999' }

      // Act
      const response = await postForm(
        server,
        calfPath(registrationId, 'calf-details', 2),
        payload
      )

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(
        calfPath(registrationId, 'dam-details', 2)
      )
      const calf = await registrationClient.getCalf({
        cph: CPH,
        registrationId,
        userId: 'test-user',
        calfNumber: 2
      })
      expect(calf.calfDetails).toEqual(payload)
    })

    test('it refuses an ear tag another calf in the registration has', async () => {
      // Arrange
      const registrationId = await startRegistration(server)
      const payload = { ...calfDetailsPayload, earTagNumber: 'uk123456 301550' }

      // Act
      const response = await postForm(
        server,
        calfPath(registrationId, 'calf-details', 2),
        payload
      )

      // Assert
      expect(response.statusCode).toBe(statusCodes.badRequest)
      const $ = load(response.payload)
      expect($('.govuk-error-summary a').text().trim()).toBe(DUPLICATE_MESSAGE)
      expect($('.govuk-error-summary a').attr('href')).toBe('#earTagNumber')
      expect($('#earTagNumber-error').text().trim()).toBe(
        `Error: ${DUPLICATE_MESSAGE}`
      )
      expect($('#earTagNumber').val()).toBe('uk123456 301550')
    })

    test('it returns not found for a calf after the next one', async () => {
      // Arrange
      const registrationId = await startRegistration(server)
      const saveCalfDetails = vi.spyOn(registrationClient, 'saveCalfDetails')

      // Act
      const response = await postForm(
        server,
        calfPath(registrationId, 'calf-details', 3),
        calfDetailsPayload
      )

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
      expect(saveCalfDetails).toHaveBeenCalledOnce()
    })
  })
})
