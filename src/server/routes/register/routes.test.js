import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { issueHubJwt } from '@livestock/hubs-infra-access/auth'

import { createServer } from '../../server.js'

const ROOT_PATH = '/cattle/register'
const CPH_PATH = '/10/081/1234'

const hubJwtConfig = {
  secret: 'local-dev-hub-jwt-signing-secret-please-change-1234567890',
  issuer: 'https://front-office.lis.defra',
  audience: 'livestock-spokes',
  ttlSeconds: 3600
}

describe('register routes', () => {
  let server
  let cookie

  beforeEach(async () => {
    server = await createServer()
    const hubJwt = await issueHubJwt(
      {
        sub: 'test-user',
        email: 'test.user@example.com',
        roles: ['lis-role-front-office', 'lis-role-caseworker-super']
      },
      hubJwtConfig
    )
    cookie = `livestock_hub_jwt=${hubJwt}`
  })

  afterEach(async () => {
    await server.stop({ timeout: 0 })
  })

  async function startBundle() {
    const response = await server.inject({
      method: 'POST',
      url: `${CPH_PATH}/bundles`,
      headers: { cookie }
    })
    return response.headers.location
      .replace(ROOT_PATH, '')
      .replace(/\/calf$/, '')
  }

  test('GET / renders the registrations page for an authorised user', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/',
      headers: { cookie }
    })

    expect(response.statusCode).toBe(200)
    expect(response.payload).toContain('Cattle registrations')
    expect(response.payload).toContain('Start a new registration')
  })

  test('GET calf renders the breed autocomplete text input', async () => {
    const startResponse = await server.inject({
      method: 'POST',
      url: `${CPH_PATH}/bundles`,
      headers: { cookie }
    })
    const routeUrl = startResponse.headers.location.replace(ROOT_PATH, '')

    const response = await server.inject({
      method: 'GET',
      url: routeUrl,
      headers: { cookie }
    })

    expect(response.statusCode).toBe(200)
    expect(response.payload).toContain('data-module="app-autocomplete"')
    expect(response.payload).toContain('<input class="govuk-input" id="breed"')
    expect(response.payload).toContain('<li>Aberdeen Angus</li>')
    expect(response.payload).not.toContain(
      '<select class="govuk-select" id="breed"'
    )
  })

  test('returns not found when the URL CPH does not match the bundle', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/98/765/4321/bundles/REG-MNBX4Q2A',
      headers: { cookie }
    })

    expect(response.statusCode).toBe(404)
  })

  test('accepts a CPH carried in nested front-office holdings', async () => {
    const holdingJwt = await issueHubJwt(
      {
        sub: 'holding-user',
        email: 'holding.user@example.com',
        roles: ['lis-role-front-office', 'lis-role-caseworker-super'],
        holdings: [
          {
            group_name: 'My farm',
            cphs: [{ cph: '10/081/1234' }]
          }
        ]
      },
      hubJwtConfig
    )
    const holdingCookie = `livestock_hub_jwt=${holdingJwt}`

    const landing = await server.inject({
      method: 'GET',
      url: '/10/081/1234',
      headers: { cookie: holdingCookie }
    })
    expect(landing.statusCode).toBe(200)

    const start = await server.inject({
      method: 'POST',
      url: '/10/081/1234/bundles',
      headers: { cookie: holdingCookie }
    })
    expect(start.statusCode).toBe(302)
    expect(start.headers.location).toMatch(
      /^\/cattle\/register\/10\/081\/1234\/bundles\/.+\/calf$/
    )
  })

  test('allows a back-office user to access a bundle under any CPH', async () => {
    const backOfficeJwt = await issueHubJwt(
      {
        sub: 'caseworker',
        email: 'caseworker@example.com',
        roles: ['lis-role-back-office']
      },
      {
        ...hubJwtConfig,
        issuer: 'http://localhost:3102'
      }
    )

    const response = await server.inject({
      method: 'GET',
      url: '/21/456/7890/bundles/REG-MN7T6R4B',
      headers: { cookie: `livestock_hub_jwt=${backOfficeJwt}` }
    })

    expect(response.statusCode).toBe(200)
    expect(response.payload).toContain('REG-MN7T6R4B')
    expect(response.payload).toContain('21/456/7890')
  })

  test('redirects an unauthenticated back-office request to back-office login', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/21/456/7890/bundles/REG-MN7T6R4B',
      headers: {
        host: 'back-office.lis.defra',
        'x-forwarded-host': 'back-office.lis.defra',
        'x-forwarded-proto': 'https'
      }
    })

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(
      'https://back-office.lis.defra/auth/login?returnUrl=%2Fcattle%2Fregister%2F21%2F456%2F7890%2Fbundles%2FREG-MN7T6R4B'
    )
  })

  test('renders a CPH-scoped landing page and bundle summary', async () => {
    const landing = await server.inject({
      method: 'GET',
      url: CPH_PATH,
      headers: { cookie }
    })
    expect(landing.statusCode).toBe(200)
    expect(landing.payload).toContain(
      'action="/cattle/register/10/081/1234/bundles"'
    )
    expect(landing.payload).not.toContain('98/765/4321')

    const summary = await server.inject({
      method: 'GET',
      url: `${CPH_PATH}/bundles/REG-MNBX4Q2A`,
      headers: { cookie }
    })
    expect(summary.statusCode).toBe(200)
    expect(summary.payload).toContain('Registration summary')
    expect(summary.payload).toContain('REG-MNBX4Q2A')
  })

  test('returns not found for an unknown bundle', async () => {
    const response = await server.inject({
      method: 'GET',
      url: `${CPH_PATH}/bundles/not-a-bundle`,
      headers: { cookie }
    })

    expect(response.statusCode).toBe(404)
  })

  test.each([
    ['calf', `${ROOT_PATH}${CPH_PATH}`],
    ['dam', 'bundle/calf'],
    ['genetic-dam', 'bundle/dam'],
    ['surrogate-dam', 'bundle/dam'],
    ['sire', 'bundle/dam'],
    ['check', 'bundle/sire']
  ])(
    'GET %s renders a back link to the previous step',
    async (page, previousPage) => {
      const startResponse = await server.inject({
        method: 'POST',
        url: `${CPH_PATH}/bundles`,
        headers: { cookie }
      })
      const bundleUrl = startResponse.headers.location.replace(/\/calf$/, '')
      const routeBundleUrl = bundleUrl.replace(ROOT_PATH, '')

      const response = await server.inject({
        method: 'GET',
        url: `${routeBundleUrl}/${page}`,
        headers: { cookie }
      })

      expect(response.statusCode).toBe(200)
      const backUrl = previousPage.replace('bundle', bundleUrl)
      expect(response.payload).toContain(
        `<a href="${backUrl}" class="govuk-back-link">Back</a>`
      )
    }
  )

  test.each([
    [
      'calf',
      {
        calf_tag: 'UK 12 3456 100003',
        'dob-day': '1',
        'dob-month': '2',
        'dob-year': '2026',
        sex: 'female',
        breed: 'Aberdeen Angus'
      },
      'dam'
    ],
    ['dam', { dam_type: 'genetic' }, 'genetic-dam'],
    ['genetic-dam', { genetic_dam_tag: 'UK 12 3456 000001' }, 'sire'],
    [
      'surrogate-dam',
      {
        genetic_dam_tag: 'UK 12 3456 000001',
        surrogate_tag: 'UK 12 3456 000002'
      },
      'sire'
    ],
    ['sire', { sire_tag: '', sire_name: '' }, 'check']
  ])('POST %s redirects to %s', async (page, payload, destination) => {
    const bundleUrl = await startBundle()
    const response = await server.inject({
      method: 'POST',
      url: `${bundleUrl}/${page}`,
      headers: { cookie },
      payload
    })

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(
      `${ROOT_PATH}${bundleUrl}/${destination}`
    )
  })

  test.each([
    ['calf', {}, 'Enter the animal ear tag number'],
    ['dam', {}, 'Select the type of the dam'],
    ['genetic-dam', {}, 'Enter the ear tag number of the genetic dam'],
    ['surrogate-dam', {}, 'Enter the animal ear tag number']
  ])('POST %s redisplays validation errors', async (page, payload, message) => {
    const bundleUrl = await startBundle()
    const response = await server.inject({
      method: 'POST',
      url: `${bundleUrl}/${page}`,
      headers: { cookie },
      payload
    })

    expect(response.statusCode).toBe(400)
    expect(response.payload).toContain(`Error:`)
    expect(response.payload).toContain(message)
  })

  test('checks, lists, submits and confirms a bundle', async () => {
    const bundleUrl = await startBundle()

    const checkResponse = await server.inject({
      method: 'POST',
      url: `${bundleUrl}/check`,
      headers: { cookie }
    })
    expect(checkResponse.statusCode).toBe(302)
    expect(checkResponse.headers.location).toBe(`${ROOT_PATH}${bundleUrl}`)

    const listResponse = await server.inject({
      method: 'GET',
      url: `${bundleUrl}/submission-list`,
      headers: { cookie }
    })
    expect(listResponse.statusCode).toBe(200)
    expect(listResponse.payload).toContain('/calves/CALF-')
    expect(listResponse.payload).not.toContain('tagRef')

    const invalidListResponse = await server.inject({
      method: 'POST',
      url: `${bundleUrl}/submission-list`,
      headers: { cookie },
      payload: {}
    })
    expect(invalidListResponse.statusCode).toBe(400)
    expect(invalidListResponse.payload).toContain(
      'Select yes to add additional animals or no to continue'
    )

    const listSubmitResponse = await server.inject({
      method: 'POST',
      url: `${bundleUrl}/submission-list`,
      headers: { cookie },
      payload: { add_more: 'no' }
    })
    expect(listSubmitResponse.headers.location).toBe(
      `${ROOT_PATH}${bundleUrl}/submit`
    )

    const submitPage = await server.inject({
      method: 'GET',
      url: `${bundleUrl}/submit`,
      headers: { cookie }
    })
    expect(submitPage.statusCode).toBe(200)
    expect(submitPage.payload).toContain('Now submit your cattle registration')

    const submitResponse = await server.inject({
      method: 'POST',
      url: `${bundleUrl}/submit`,
      headers: { cookie }
    })
    expect(submitResponse.headers.location).toBe(
      `${ROOT_PATH}${bundleUrl}/confirmation`
    )

    const confirmationResponse = await server.inject({
      method: 'GET',
      url: `${bundleUrl}/confirmation`,
      headers: { cookie }
    })
    expect(confirmationResponse.statusCode).toBe(200)
    expect(confirmationResponse.payload).toContain('Cattle birth report sent')
  })

  test('returns to calf entry when adding another animal', async () => {
    const bundleUrl = await startBundle()
    const response = await server.inject({
      method: 'POST',
      url: `${bundleUrl}/submission-list`,
      headers: { cookie },
      payload: { add_more: 'yes' }
    })

    expect(response.headers.location).toBe(`${ROOT_PATH}${bundleUrl}/calf`)
  })

  test('rejects missing calves and prevents editing submitted bundles', async () => {
    const missingCalf = await server.inject({
      method: 'GET',
      url: `${CPH_PATH}/bundles/REG-MNBX4Q2A/calves/not-a-calf/check`,
      headers: { cookie }
    })
    expect(missingCalf.statusCode).toBe(404)

    const readOnlyEdit = await server.inject({
      method: 'GET',
      url: `${CPH_PATH}/bundles/REG-MNBX1K8F/calf`,
      headers: { cookie }
    })
    expect(readOnlyEdit.statusCode).toBe(409)
  })
})
