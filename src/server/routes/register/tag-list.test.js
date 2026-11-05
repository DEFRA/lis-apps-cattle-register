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
  keeperAuth,
  postForm,
  startRegistration
} from '#test-helpers/calf-registration.js'
import { createServer } from '#server/server.js'

const NOW = new Date('2026-11-05T10:00:00Z')

describe('tag list route', () => {
  let server

  /**
   * @param {string} registrationId
   * @returns {string}
   */
  function tagListPath(registrationId) {
    return `${REGISTER_PATH}/${registrationId}/tag-list`
  }

  /**
   * @param {string} url
   * @param {object} [auth]
   * @returns {Promise<object>}
   */
  function get(url, auth = keeperAuth) {
    return server.inject({ method: 'GET', url, auth })
  }

  /**
   * @param {object} $ - the loaded page
   * @returns {{ earTag: string, href: string, status: string }[]}
   */
  function calfRows($) {
    return $('#calves tbody tr')
      .toArray()
      .map((row) => ({
        earTag: $(row).find('td').eq(0).text().trim(),
        href: $(row).find('td a').attr('href'),
        status: $(row).find('.govuk-tag').text().trim()
      }))
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

  describe('GET tag list', () => {
    test('it renders the calves in the registration and the add more question', async () => {
      // Arrange
      const registrationId = await startRegistration(server)
      await postForm(server, calfPath(registrationId, 'check-calf-details'), {})

      // Act
      const response = await get(tagListPath(registrationId))

      // Assert
      expect(response.statusCode).toBe(statusCodes.ok)
      const $ = load(response.payload)
      expect($('title').text().trim()).toMatch(/^Register new cattle births - /)
      expect($('h1').text().trim()).toBe('Register new cattle births')
      expect($('h1')).toHaveLength(1)
      expect($('.govuk-back-link').attr('href')).toBe(
        calfPath(registrationId, 'check-calf-details')
      )
      expect(
        $('#calves thead th')
          .toArray()
          .map((cell) => $(cell).text().trim())
      ).toEqual(['Tag number', 'Status'])
      expect(calfRows($)).toEqual([
        {
          earTag: 'UK 123456 301550',
          href: calfPath(registrationId, 'check-calf-details'),
          status: 'Ready to send'
        }
      ])
      expect($('#calves .govuk-tag--green')).toHaveLength(1)
      expect($('main form').attr('action')).toBe(tagListPath(registrationId))
      expect($('main form').attr('method')).toBe('post')
      expect($('legend').text().trim()).toBe('Add more animals')
      expect($('#addAnother-hint').text().trim()).toBe(
        'You can add calves from different dams or siblings from a multiple birth.'
      )
      expect($('label[for="addAnother"]').text().trim()).toBe('Yes')
      expect($('label[for="addAnother-2"]').text().trim()).toBe('No')
      expect($('input[name="addAnother"]:checked')).toHaveLength(0)
      expect($('.govuk-error-summary')).toHaveLength(0)
      expect($('main .govuk-button').text().trim()).toBe('Continue')
    })

    test('it marks an unconfirmed calf incomplete and links to its first unfinished page', async () => {
      // Arrange
      const registrationId = await startRegistration(server, {
        sireDetails: null
      })

      // Act
      const response = await get(tagListPath(registrationId))

      // Assert
      const $ = load(response.payload)
      expect(calfRows($)).toEqual([
        {
          earTag: 'UK 123456 301550',
          href: calfPath(registrationId, 'sire-details'),
          status: 'Incomplete'
        }
      ])
      expect($('#calves .govuk-tag--blue')).toHaveLength(1)
    })

    test('it links a finished but unconfirmed calf to check calf details', async () => {
      // Arrange
      const registrationId = await startRegistration(server)

      // Act
      const response = await get(tagListPath(registrationId))

      // Assert
      expect(calfRows(load(response.payload))).toEqual([
        {
          earTag: 'UK 123456 301550',
          href: calfPath(registrationId, 'check-calf-details'),
          status: 'Incomplete'
        }
      ])
    })

    test('it lists every calf in the order they were added', async () => {
      // Arrange
      const registrationId = await startRegistration(server, {
        damType: null
      })
      await addCalf(server, registrationId, 2)
      await addCalf(server, registrationId, 3, { complete: false })

      // Act
      const response = await get(tagListPath(registrationId))

      // Assert
      const $ = load(response.payload)
      expect(calfRows($)).toEqual([
        {
          earTag: 'UK 123456 301550',
          href: calfPath(registrationId, 'dam-details'),
          status: 'Incomplete'
        },
        {
          earTag: 'UK 123456 301552',
          href: calfPath(registrationId, 'check-calf-details', 2),
          status: 'Ready to send'
        },
        {
          earTag: 'UK 123456 301553',
          href: calfPath(registrationId, 'dam-details', 3),
          status: 'Incomplete'
        }
      ])
      expect($('.govuk-back-link').attr('href')).toBe(
        calfPath(registrationId, 'dam-details', 3)
      )
    })

    test('it escapes the ear tag the user entered', async () => {
      // Arrange
      const registrationId = await startRegistration(server, {
        calfDetails: {
          earTagNumber: '<b>tag</b>',
          dateOfBirth: '1/11/2026',
          sex: 'female',
          breed: 'Aberdeen Angus (AA)'
        }
      })

      // Act
      const response = await get(tagListPath(registrationId))

      // Assert
      const $ = load(response.payload)
      expect($('#calves b')).toHaveLength(0)
      expect(calfRows($)[0].earTag).toContain('tag')
    })

    test('it sends a registration with no calves to calf details', async () => {
      // Arrange
      const registrationId = randomUUID()

      // Act
      const response = await get(tagListPath(registrationId))

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(
        `${REGISTER_PATH}/${registrationId}/calf-details`
      )
    })

    test('it returns not found for a malformed registration id', async () => {
      // Arrange
      const url = `${REGISTER_PATH}/not-a-uuid/tag-list`

      // Act
      const response = await get(url)

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
    })

    test('it returns not found for a CPH the user is not granted', async () => {
      // Arrange
      const registrationId = await startRegistration(server)
      const auth = spokeAuth(createUser(['20/202/2020']))

      // Act
      const response = await get(tagListPath(registrationId), auth)

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
    })
  })
})
