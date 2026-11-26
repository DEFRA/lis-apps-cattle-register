import { afterEach, describe, expect, test, vi } from 'vitest'

import { createSubmissionClient } from '@defra/lis-hubs-infra-core'

const service = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn()
}))

vi.mock('@defra/lis-hubs-infra-core', () => ({
  createSubmissionClient: vi.fn(() => service)
}))

describe('CattleRegisterBe4FeClient', () => {
  afterEach(() => {
    vi.resetAllMocks()
    vi.unstubAllEnvs()
  })

  test('it sends the configured BE4FE API key', async () => {
    // Arrange
    vi.stubEnv('CATTLE_REGISTER_API_KEY', 'test-api-key')
    vi.resetModules()

    // Act
    vi.mocked(createSubmissionClient).mockReturnValue(service)
    await import('./client.js')

    // Assert
    expect(vi.mocked(createSubmissionClient)).toHaveBeenLastCalledWith(
      expect.objectContaining({
        apiKey: 'test-api-key',
        serviceName: 'lis-be4fe-cattle-register'
      })
    )
  })

  test.each([
    ['default', undefined, 5000],
    ['environment override', '12000', 12000]
  ])(
    'it passes the %s timeout to the service client',
    async (_, value, expected) => {
      // Arrange
      vi.stubEnv('CATTLE_REGISTER_API_TIMEOUT', value)
      vi.resetModules()

      // Act
      vi.mocked(createSubmissionClient).mockReturnValue(service)
      await import('./client.js')

      // Assert
      expect(vi.mocked(createSubmissionClient)).toHaveBeenLastCalledWith(
        expect.objectContaining({ timeout: expected })
      )
    }
  )
})
