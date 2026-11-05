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
const REGISTRATION_ID = '6f1c3c1e-6a0b-4b8e-9d3f-2a1b0c9d8e7f'
const REGISTER_PATH = `/holdings/${CPH}/cattle/register`
const CALF_DETAILS_PATH = `${REGISTER_PATH}/${REGISTRATION_ID}/calf-details`
const NOW = new Date('2026-11-05T10:00:00Z')

const validPayload = {
  earTagNumber: 'UK123456301550',
  dateOfBirth: '1/11/2026',
  sex: 'female',
  breed: 'Aberdeen Angus (AA)'
}

/**
 * @param {'*'|string[]} cphs
 * @param {string[]} [permissions]
 * @returns {object} a hydrated user with those permissions on those CPHs
 */
function createUser(cphs, permissions = ['lis-perm-cattle-register-write']) {
  return {
    sub: 'test-user',
    email: 'test.user@example.com',
    statements: [{ role: 'lis-role-keeper', cphs, permissions }]
  }
}

const keeperAuth = spokeAuth(createUser([CPH]))

describe('register routes', () => {
  let server

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

  describe('GET /holdings/{cph}/cattle/register', () => {
    test('it redirects to calf details for a new registration id', async () => {
      // Arrange
      const request = { method: 'GET', url: REGISTER_PATH, auth: keeperAuth }

      // Act
      const response = await server.inject(request)

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toMatch(
        /^\/holdings\/10\/081\/1234\/cattle\/register\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/calf-details$/
      )
    })

    test('it gives a new registration id each time', async () => {
      // Arrange
      const request = { method: 'GET', url: REGISTER_PATH, auth: keeperAuth }

      // Act
      const first = await server.inject(request)
      const second = await server.inject(request)

      // Assert
      expect(first.headers.location).not.toBe(second.headers.location)
    })

    test('it returns not found for a CPH the user is not granted', async () => {
      // Arrange
      const auth = spokeAuth(createUser(['22/002/0002']))

      // Act
      const response = await server.inject({
        method: 'GET',
        url: REGISTER_PATH,
        auth
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
    })

    test('it returns not found for a malformed CPH', async () => {
      // Arrange
      const auth = spokeAuth(createUser('*'))

      // Act
      const response = await server.inject({
        method: 'GET',
        url: '/holdings/1/2/3/cattle/register',
        auth
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
    })
  })

  describe('GET calf details', () => {
    test('it renders the calf details form', async () => {
      // Arrange
      const request = {
        method: 'GET',
        url: CALF_DETAILS_PATH,
        auth: keeperAuth
      }

      // Act
      const response = await server.inject(request)

      // Assert
      expect(response.statusCode).toBe(statusCodes.ok)
      const $ = load(response.payload)
      expect($('title').text().trim()).toMatch(/^Calf details - /)
      expect($('h1').text().trim()).toBe('Calf details')
      expect($('.govuk-back-link').attr('href')).toBe(`/holdings/${CPH}/cattle`)
      expect($('main form').attr('action')).toBe(CALF_DETAILS_PATH)
      expect($('main form').attr('method')).toBe('post')
      expect($('.govuk-error-summary')).toHaveLength(0)
      expect($('.govuk-warning-text')).toHaveLength(0)
      expect($('input[name="acknowledgedLateDateOfBirth"]')).toHaveLength(0)
      expect($('label[for="earTagNumber"]').text().trim()).toBe(
        'Animal ear tag number'
      )
      expect($('#earTagNumber-hint').text().trim()).toBe(
        'Enter the full animal ear tag number. For example, UK123456123456'
      )
      expect($('#earTagNumber').attr('type')).toBe('text')
      expect(
        $('#earTagNumber').closest('[data-module="app-autocomplete"]')
      ).toHaveLength(0)
      expect($('label[for="dateOfBirth"]').text().trim()).toBe('Date of birth')
      expect($('#dateOfBirth-hint').text().trim()).toBe(
        'Select from the calendar or enter manually, for example 27/3/2026'
      )
      expect($('[data-module="lis-date-picker"]').attr('data-max-date')).toBe(
        '5/11/2026'
      )
      expect($('.govuk-fieldset__legend').text().trim()).toBe('Sex of the calf')
      expect($('.govuk-radios--inline input[name="sex"]')).toHaveLength(2)
      expect($('#sex').attr('value')).toBe('male')
      expect($('label[for="breed"]').text().trim()).toBe('Breed')
      expect($('#breed-hint').text().trim()).toBe(
        'Start typing the breed or enter the breed code and select from the list'
      )
      expect(
        $('#breed')
          .closest('[data-module="app-autocomplete"]')
          .find('.app-autocomplete__source li')
          .first()
          .text()
      ).toBe('Aberdeen Angus (AA)')
      expect($('main button.govuk-button').text().trim()).toBe('Continue')
    })

    test('it fills the form from saved answers', async () => {
      // Arrange
      vi.spyOn(registrationClient, 'getCalfDetails').mockResolvedValueOnce({
        answers: validPayload
      })

      // Act
      const response = await server.inject({
        method: 'GET',
        url: CALF_DETAILS_PATH,
        auth: keeperAuth
      })

      // Assert
      const $ = load(response.payload)
      expect($('#earTagNumber').val()).toBe('UK123456301550')
      expect($('#dateOfBirth').val()).toBe('1/11/2026')
      expect($('input[name="sex"][value="female"]').attr('checked')).toBe(
        'checked'
      )
      expect($('#breed').val()).toBe('Aberdeen Angus (AA)')
      expect(registrationClient.getCalfDetails).toHaveBeenCalledWith({
        cph: CPH,
        registrationId: REGISTRATION_ID
      })
    })

    test.each([
      ['not a UUID', `${REGISTER_PATH}/REG-123/calf-details`],
      ['a truncated UUID', `${REGISTER_PATH}/6f1c3c1e-6a0b-4b8e/calf-details`]
    ])(
      'it returns not found for a registration id that is %s',
      async (_description, url) => {
        // Arrange
        const request = { method: 'GET', url, auth: keeperAuth }

        // Act
        const response = await server.inject(request)

        // Assert
        expect(response.statusCode).toBe(statusCodes.notFound)
        expect(load(response.payload)('h1').text().trim()).toBe(
          'Page not found'
        )
      }
    )

    test('it returns not found for a CPH the user is not granted', async () => {
      // Arrange
      const auth = spokeAuth(createUser(['22/002/0002']))
      const getCalfDetails = vi.spyOn(registrationClient, 'getCalfDetails')

      // Act
      const response = await server.inject({
        method: 'GET',
        url: CALF_DETAILS_PATH,
        auth
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
      expect(getCalfDetails).not.toHaveBeenCalled()
    })

    test('it returns not found for a user with only read on the CPH', async () => {
      // Arrange
      const auth = spokeAuth(
        createUser([CPH], ['lis-perm-cattle-register-read'])
      )

      // Act
      const response = await server.inject({
        method: 'GET',
        url: CALF_DETAILS_PATH,
        auth
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
    })

    test('it allows a back-office user with register admin on every CPH', async () => {
      // Arrange
      const auth = spokeAuth(
        createUser('*', ['lis-perm-cattle-register-admin'])
      )

      // Act
      const response = await server.inject({
        method: 'GET',
        url: CALF_DETAILS_PATH,
        auth
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.ok)
    })

    test('it rejects a request without a hub service token', async () => {
      // Arrange
      const request = { method: 'GET', url: CALF_DETAILS_PATH }

      // Act
      const response = await server.inject(request)

      // Assert
      expect(response.statusCode).toBe(statusCodes.unauthorized)
    })
  })

  describe('POST calf details', () => {
    test('it saves the answers and redirects to dam details', async () => {
      // Arrange
      const saveCalfDetails = vi.spyOn(registrationClient, 'saveCalfDetails')

      // Act
      const response = await server.inject({
        method: 'POST',
        url: CALF_DETAILS_PATH,
        auth: keeperAuth,
        payload: { ...validPayload, unexpected: 'ignored' }
      })

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(
        `${REGISTER_PATH}/${REGISTRATION_ID}/dam-details`
      )
      expect(saveCalfDetails).toHaveBeenCalledWith({
        cph: CPH,
        registrationId: REGISTRATION_ID,
        answers: validPayload
      })
    })

    test.each([
      [
        'a blank ear tag',
        { earTagNumber: '' },
        'earTagNumber',
        'Enter the animal ear tag number'
      ],
      [
        'a blank date of birth',
        { dateOfBirth: '' },
        'dateOfBirth',
        'Enter the date the animal was born'
      ],
      [
        'a date of birth that is not three parts',
        { dateOfBirth: '1-11-2026' },
        'dateOfBirth',
        'Enter the date the animal was born'
      ],
      [
        'a date of birth that is not a real date',
        { dateOfBirth: '31/2/2026' },
        'dateOfBirth',
        'Date of birth must be a real date, for example 01/05/2026'
      ],
      [
        'a date of birth in the future',
        { dateOfBirth: '6/11/2026' },
        'dateOfBirth',
        'Date of birth must be today or in the past'
      ],
      ['no sex', { sex: '' }, 'sex', 'Select if the animal is male or female'],
      [
        'a blank breed',
        { breed: '' },
        'breed',
        'Enter the animal breed or breed code into the text box and select the correct one from the suggested options'
      ],
      [
        'a breed not in the list',
        { breed: 'Unicorn (UN)' },
        'breed',
        'Enter the animal breed or breed code into the text box and select the correct one from the suggested options'
      ]
    ])(
      'it re-renders with an error for %s',
      async (_description, override, field, message) => {
        // Arrange
        const payload = { ...validPayload, ...override }

        // Act
        const response = await server.inject({
          method: 'POST',
          url: CALF_DETAILS_PATH,
          auth: keeperAuth,
          payload
        })

        // Assert
        expect(response.statusCode).toBe(statusCodes.badRequest)
        const $ = load(response.payload)
        expect($('title').text().trim()).toMatch(/^Error: Calf details - /)
        expect($('.govuk-error-summary__title').text().trim()).toBe(
          'There is a problem'
        )
        const summaryLinks = $('.govuk-error-summary__list a')
        expect(summaryLinks).toHaveLength(1)
        expect(summaryLinks.attr('href')).toBe(`#${field}`)
        expect(summaryLinks.text().trim()).toBe(message)
        expect($(`#${field}-error`).text().trim()).toBe(`Error: ${message}`)
        expect($(`#${field}`)).toHaveLength(1)
        expect($('.govuk-warning-text')).toHaveLength(0)
      }
    )

    test('it lists every error in page order and keeps the user input', async () => {
      // Arrange
      const payload = {
        earTagNumber: '',
        dateOfBirth: 'soon',
        sex: '',
        breed: 'Moo'
      }

      // Act
      const response = await server.inject({
        method: 'POST',
        url: CALF_DETAILS_PATH,
        auth: keeperAuth,
        payload
      })

      // Assert
      const $ = load(response.payload)
      expect(
        $('.govuk-error-summary__list a')
          .map((_i, link) => $(link).attr('href'))
          .get()
      ).toEqual(['#earTagNumber', '#dateOfBirth', '#sex', '#breed'])
      expect($('#dateOfBirth').val()).toBe('soon')
      expect($('#breed').val()).toBe('Moo')
    })

    test('it re-renders with the late-birth warning when the date is over 27 days ago', async () => {
      // Arrange
      const payload = { ...validPayload, dateOfBirth: '8/10/2026' }

      // Act
      const response = await server.inject({
        method: 'POST',
        url: CALF_DETAILS_PATH,
        auth: keeperAuth,
        payload
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.ok)
      const $ = load(response.payload)
      expect($('.govuk-error-summary')).toHaveLength(0)
      expect($('title').text().trim()).toMatch(/^Calf details - /)
      expect($('.govuk-warning-text__text').text()).toContain(
        'Date of birth is over the 27-day deadline to report a calf birth.'
      )
      expect($('.govuk-warning-text').nextAll('.govuk-button')).toHaveLength(1)
      expect($('input[name="acknowledgedLateDateOfBirth"]').val()).toBe(
        '8/10/2026'
      )
      expect($('#dateOfBirth').val()).toBe('8/10/2026')
    })

    test('it continues when the late date has been acknowledged', async () => {
      // Arrange
      const payload = {
        ...validPayload,
        dateOfBirth: '8/10/2026',
        acknowledgedLateDateOfBirth: '8/10/2026'
      }

      // Act
      const response = await server.inject({
        method: 'POST',
        url: CALF_DETAILS_PATH,
        auth: keeperAuth,
        payload
      })

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(
        `${REGISTER_PATH}/${REGISTRATION_ID}/dam-details`
      )
    })

    test('it warns again when the acknowledged late date is changed to another late date', async () => {
      // Arrange
      const payload = {
        ...validPayload,
        dateOfBirth: '1/10/2026',
        acknowledgedLateDateOfBirth: '8/10/2026'
      }

      // Act
      const response = await server.inject({
        method: 'POST',
        url: CALF_DETAILS_PATH,
        auth: keeperAuth,
        payload
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.ok)
      const $ = load(response.payload)
      expect($('.govuk-warning-text')).toHaveLength(1)
      expect($('input[name="acknowledgedLateDateOfBirth"]').val()).toBe(
        '1/10/2026'
      )
    })

    test('it shows errors but not the warning when a late date comes with another error', async () => {
      // Arrange
      const payload = { ...validPayload, dateOfBirth: '8/10/2026', sex: '' }

      // Act
      const response = await server.inject({
        method: 'POST',
        url: CALF_DETAILS_PATH,
        auth: keeperAuth,
        payload
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.badRequest)
      const $ = load(response.payload)
      expect($('.govuk-warning-text')).toHaveLength(0)
      expect($('input[name="acknowledgedLateDateOfBirth"]')).toHaveLength(0)
    })

    test('it keeps an acknowledgement for an unchanged date through an error', async () => {
      // Arrange
      const payload = {
        ...validPayload,
        dateOfBirth: '8/10/2026',
        acknowledgedLateDateOfBirth: '8/10/2026',
        breed: ''
      }

      // Act
      const response = await server.inject({
        method: 'POST',
        url: CALF_DETAILS_PATH,
        auth: keeperAuth,
        payload
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.badRequest)
      const $ = load(response.payload)
      expect($('.govuk-warning-text')).toHaveLength(0)
      expect($('input[name="acknowledgedLateDateOfBirth"]').val()).toBe(
        '8/10/2026'
      )
    })

    test('it rejects a post sent from another site', async () => {
      // Arrange
      const saveCalfDetails = vi.spyOn(registrationClient, 'saveCalfDetails')

      // Act
      const response = await server.inject({
        method: 'POST',
        url: CALF_DETAILS_PATH,
        auth: keeperAuth,
        headers: { 'sec-fetch-site': 'cross-site' },
        payload: validPayload
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.forbidden)
      expect(saveCalfDetails).not.toHaveBeenCalled()
    })

    test('it returns not found for a CPH the user is not granted', async () => {
      // Arrange
      const auth = spokeAuth(createUser(['22/002/0002']))
      const saveCalfDetails = vi.spyOn(registrationClient, 'saveCalfDetails')

      // Act
      const response = await server.inject({
        method: 'POST',
        url: CALF_DETAILS_PATH,
        auth,
        payload: validPayload
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
      expect(saveCalfDetails).not.toHaveBeenCalled()
    })

    test('it returns not found for an invalid registration id', async () => {
      // Arrange
      const url = `${REGISTER_PATH}/not-a-uuid/calf-details`

      // Act
      const response = await server.inject({
        method: 'POST',
        url,
        auth: keeperAuth,
        payload: validPayload
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.notFound)
    })

    test('it returns bad request for a field sent more than once', async () => {
      // Arrange
      const payload = 'sex=male&sex=female'

      // Act
      const response = await server.inject({
        method: 'POST',
        url: CALF_DETAILS_PATH,
        auth: keeperAuth,
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        payload
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.badRequest)
    })
  })
})
