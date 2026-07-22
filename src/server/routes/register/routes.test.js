import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { issueHubJwt } from '@livestock/hubs-infra-access/auth'

import { createServer } from '../../server.js'

const hubJwtConfig = {
  secret: 'local-dev-hub-jwt-signing-secret-please-change-1234567890',
  issuer: 'https://front-office.lis.defra',
  audience: 'livestock-spokes',
  ttlSeconds: 3600
}

describe('register routes', () => {
  let server

  beforeEach(async () => {
    server = await createServer()
  })

  afterEach(async () => {
    await server.stop({ timeout: 0 })
  })

  test('GET /cattle/register renders the registrations page for an authorised user', async () => {
    const hubJwt = await issueHubJwt(
      {
        sub: 'test-user',
        email: 'test.user@example.com',
        roles: ['lis-role-front-office', 'lis-role-caseworker-super']
      },
      hubJwtConfig
    )

    const response = await server.inject({
      method: 'GET',
      url: '/cattle/register',
      headers: {
        cookie: `livestock_hub_jwt=${hubJwt}`
      }
    })

    expect(response.statusCode).toBe(200)
    expect(response.payload).toContain('Cattle registrations')
    expect(response.payload).toContain('Start a new registration')
  })
})
