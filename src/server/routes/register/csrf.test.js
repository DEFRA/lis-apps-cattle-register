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
const CALF_DETAILS_PATH = `/holdings/${CPH}/cattle/register/${REGISTRATION_ID}/calf-details`
const CSRF_TOKEN = 'test-csrf-token'
const csrfHeaders = {
  'sec-fetch-site': 'same-origin',
  'x-lis-csrf-token': CSRF_TOKEN
}

const validPayload = {
  earTagNumber: 'UK123456301550',
  dateOfBirth: '1/11/2026',
  sex: 'female',
  breed: 'Aberdeen Angus (AA)'
}

const keeperAuth = spokeAuth({
  sub: 'test-user',
  email: 'test.user@example.com',
  statements: [
    {
      role: 'lis-role-keeper',
      cphs: [CPH],
      permissions: ['lis-perm-cattle-register-write']
    }
  ]
})

describe('register CSRF protection', () => {
  let server

  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-05T10:00:00Z'))
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
    test('it renders the hub CSRF token in a hidden field', async () => {
      // Arrange
      const request = {
        method: 'GET',
        url: CALF_DETAILS_PATH,
        auth: keeperAuth,
        headers: csrfHeaders
      }

      // Act
      const response = await server.inject(request)

      // Assert
      const $ = load(response.payload)
      expect($('main form input[name="_csrf"]').attr('type')).toBe('hidden')
      expect($('main form input[name="_csrf"]').attr('value')).toBe(CSRF_TOKEN)
    })

    test('it renders no CSRF field when the hub sends no token', async () => {
      // Arrange
      const request = {
        method: 'GET',
        url: CALF_DETAILS_PATH,
        auth: keeperAuth
      }

      // Act
      const response = await server.inject(request)

      // Assert
      expect(load(response.payload)('input[name="_csrf"]')).toHaveLength(0)
    })
  })

  describe('POST calf details', () => {
    test('it accepts a same-origin post with a matching _csrf field', async () => {
      // Arrange
      const saveCalfDetails = vi.spyOn(registrationClient, 'saveCalfDetails')

      // Act
      const response = await server.inject({
        method: 'POST',
        url: CALF_DETAILS_PATH,
        auth: keeperAuth,
        headers: csrfHeaders,
        payload: { ...validPayload, _csrf: CSRF_TOKEN }
      })

      // Assert
      expect(response.statusCode).toBe(302)
      expect(saveCalfDetails).toHaveBeenCalledWith({
        cph: CPH,
        registrationId: REGISTRATION_ID,
        answers: validPayload
      })
    })

    test.each([
      ['has no _csrf field', {}, csrfHeaders],
      ['has the wrong _csrf value', { _csrf: 'wrong-token' }, csrfHeaders],
      [
        'is sent from another site',
        { _csrf: CSRF_TOKEN },
        { ...csrfHeaders, 'sec-fetch-site': 'cross-site' }
      ],
      [
        'is sent from a sibling subdomain',
        { _csrf: CSRF_TOKEN },
        { ...csrfHeaders, 'sec-fetch-site': 'same-site' }
      ]
    ])('it rejects a post that %s', async (_description, extra, headers) => {
      // Arrange
      const saveCalfDetails = vi.spyOn(registrationClient, 'saveCalfDetails')

      // Act
      const response = await server.inject({
        method: 'POST',
        url: CALF_DETAILS_PATH,
        auth: keeperAuth,
        headers,
        payload: { ...validPayload, ...extra }
      })

      // Assert
      expect(response.statusCode).toBe(statusCodes.forbidden)
      expect(saveCalfDetails).not.toHaveBeenCalled()
    })

    test('it re-renders the CSRF token when a valid-token post fails validation', async () => {
      // Arrange
      const request = {
        method: 'POST',
        url: CALF_DETAILS_PATH,
        auth: keeperAuth,
        headers: csrfHeaders,
        payload: { ...validPayload, earTagNumber: '', _csrf: CSRF_TOKEN }
      }

      // Act
      const response = await server.inject(request)

      // Assert
      expect(response.statusCode).toBe(statusCodes.badRequest)
      const $ = load(response.payload)
      expect($('main form input[name="_csrf"]').attr('value')).toBe(CSRF_TOKEN)
    })

    test('it rejects a same-origin post with no CSRF header and an empty _csrf field', async () => {
      // Arrange
      const request = {
        method: 'POST',
        url: CALF_DETAILS_PATH,
        auth: keeperAuth,
        headers: { 'sec-fetch-site': 'same-origin' },
        payload: { ...validPayload, _csrf: '' }
      }

      // Act
      const response = await server.inject(request)

      // Assert
      expect(response.statusCode).toBe(statusCodes.forbidden)
    })
  })
})
