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
  calfDetailsPayload,
  calfPath,
  createUser,
  keeperAuth,
  startRegistration
} from '#test-helpers/calf-registration.js'
import { createServer } from '#server/server.js'
import { registrationClient } from '#server/services/registration-client.js'

const NOW = new Date('2026-11-05T10:00:00Z')

/**
 * @param {object} $ - the loaded page
 * @returns {{ key: string, value: string, change: string, href: string }[]}
 *   each summary list row's text, Change link text and address
 */
function summaryRows($) {
  return $('.govuk-summary-list__row')
    .map((_index, element) => {
      const row = $(element)
      const link = row.find('.govuk-summary-list__actions a')

      return {
        key: row.find('.govuk-summary-list__key').text().trim(),
        value: row.find('.govuk-summary-list__value').text().trim(),
        change: link.text().trim(),
        href: link.attr('href')
      }
    })
    .get()
}

describe('check calf details route', () => {
  let server

  /**
   * @param {object} [options] - see startRegistration()
   * @returns {Promise<string>} the registration id
   */
  function registration(options) {
    return startRegistration(server, options)
  }

  /**
   * @param {string} registrationId
   * @param {object} [options]
   * @param {number|string} [options.calfNumber]
   * @param {object} [options.auth]
   * @returns {Promise<object>} the response to a GET of the page
   */
  function get(registrationId, { calfNumber = 1, auth = keeperAuth } = {}) {
    return server.inject({
      method: 'GET',
      url: calfPath(registrationId, 'check-calf-details', calfNumber),
      auth
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

  describe('GET check calf details', () => {
    test('it renders the answers about a calf born via a genetic dam', async () => {
      // Arrange
      const registrationId = await registration()

      // Act
      const response = await get(registrationId)

      // Assert
      expect(response.statusCode).toBe(statusCodes.ok)
      const $ = load(response.payload)
      expect($('title').text().trim()).toMatch(/^Check calf details - /)
      expect($('h1').text().trim()).toBe('Check calf details')
      expect($('.govuk-back-link').attr('href')).toBe(
        calfPath(registrationId, 'sire-details')
      )
      const calfDetailsHref = `${REGISTER_PATH}/${registrationId}/calf-details?return=check`
      expect(summaryRows($)).toEqual([
        {
          key: 'Animal ear tag number',
          value: 'UK 123456 301550',
          change: 'Change ear tag number',
          href: calfDetailsHref
        },
        {
          key: 'Date of birth',
          value: '1 November 2026',
          change: 'Change date of birth',
          href: calfDetailsHref
        },
        {
          key: 'Sex',
          value: 'Female',
          change: 'Change sex',
          href: calfDetailsHref
        },
        {
          key: 'Breed',
          value: 'Aberdeen Angus (AA)',
          change: 'Change breed',
          href: calfDetailsHref
        },
        {
          key: 'Dam type',
          value: 'Genetic',
          change: 'Change dam type',
          href: `${calfPath(registrationId, 'dam-details')}?return=check`
        },
        {
          key: 'Genetic dam ear tag number',
          value: 'UK 123456 501100',
          change: 'Change genetic dam ear tag number',
          href: `${calfPath(registrationId, 'genetic-dam')}?return=check`
        },
        {
          key: 'Sire ear tag number',
          value: 'UK 123456 701300',
          change: 'Change sire ear tag number',
          href: `${calfPath(registrationId, 'sire-details')}?return=check`
        },
        {
          key: 'Sire name',
          value: 'Big Bob',
          change: 'Change sire name',
          href: `${calfPath(registrationId, 'sire-details')}?return=check`
        }
      ])
      expect(
        $('.govuk-summary-list__actions a .govuk-visually-hidden')
          .first()
          .text()
      ).toBe(' ear tag number')
      expect($('main form').attr('action')).toBe(
        calfPath(registrationId, 'check-calf-details')
      )
      expect($('main form').attr('method')).toBe('post')
      expect($('main form button').text().trim()).toBe('Continue')
    })

    test('it shows only the surrogate dam answers for a calf born via a surrogate dam', async () => {
      // Arrange
      const registrationId = await registration({
        damType: 'surrogate',
        calfDetails: { ...calfDetailsPayload, sex: 'male' }
      })

      // Act
      const response = await get(registrationId)

      // Assert
      const rows = summaryRows(load(response.payload))
      const surrogateDamHref = `${calfPath(registrationId, 'surrogate-dam')}?return=check`
      expect(rows.map(({ key }) => key)).toEqual([
        'Animal ear tag number',
        'Date of birth',
        'Sex',
        'Breed',
        'Dam type',
        'Genetic dam ear tag number',
        'Surrogate dam ear tag number',
        'Sire ear tag number',
        'Sire name'
      ])
      expect(rows[2].value).toBe('Male')
      expect(rows[4].value).toBe('Surrogate')
      expect(rows.slice(5, 7)).toEqual([
        {
          key: 'Genetic dam ear tag number',
          value: 'UK 123456 501101',
          change: 'Change genetic dam ear tag number',
          href: surrogateDamHref
        },
        {
          key: 'Surrogate dam ear tag number',
          value: 'UK 123456 601200',
          change: 'Change surrogate dam ear tag number',
          href: surrogateDamHref
        }
      ])
    })

    test('it shows sire answers left blank as not provided', async () => {
      // Arrange
      const registrationId = await registration({ sireDetails: {} })

      // Act
      const response = await get(registrationId)

      // Assert
      const rows = summaryRows(load(response.payload))
      expect(rows.slice(-2).map(({ key, value }) => [key, value])).toEqual([
        ['Sire ear tag number', 'Not provided'],
        ['Sire name', 'Not provided']
      ])
    })

    test('it shows an ear tag number in another format as entered, escaped', async () => {
      // Arrange
      const registrationId = await registration({
        calfDetails: { ...calfDetailsPayload, earTagNumber: '<b>UK1</b>' }
      })

      // Act
      const response = await get(registrationId)

      // Assert
      const $ = load(response.payload)
      expect($('main b')).toHaveLength(0)
      expect(summaryRows($)[0].value).toBe('<b>UK1</b>')
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
      ],
      ['sire details is not saved', { sireDetails: null }, 'sire-details']
    ])(
      'it sends the user to the first unfinished page when %s',
      async (_description, options, page) => {
        // Arrange
        const registrationId = await registration(options)

        // Act
        const response = await get(registrationId)

        // Assert
        expect(response.statusCode).toBe(302)
        expect(response.headers.location).toBe(calfPath(registrationId, page))
      }
    )

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
      const response = await get(registrationId, { calfNumber })

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
      const response = await get(registrationId, { auth: spokeAuth(user) })

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
      expect(getCalf).not.toHaveBeenCalled()
    })
  })
})
