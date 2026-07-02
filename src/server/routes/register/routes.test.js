import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { issueHubJwt } from '@livestock/ui-services/auth'

import { createServer } from '../../server.js'

const hubJwtConfig = {
  secret: 'local-dev-hub-jwt-signing-secret-please-change-1234567890',
  issuer: 'http://localhost:3000',
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

  test('GET /cattle/register renders the calf details page for an authorised user', async () => {
    const hubJwt = await issueHubJwt(
      {
        sub: 'test-user',
        email: 'test.user@example.com',
        permissions: ['lis-perm-front-office', 'lis-perm-cattle-register-write']
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
    expect(response.payload).toContain('Calf details')
  })
})
