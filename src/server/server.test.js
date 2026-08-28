import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { logger } from '@defra/lis-hubs-infra-core'
import { createServer } from './server.js'

describe('#createServer', () => {
  let server

  beforeEach(async () => {
    server = await createServer()
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await server.stop({ timeout: 0 })
  })

  test('Should dump supported routes to the console', () => {
    const infoSpy = vi
      .spyOn(console, 'info')
      .mockImplementation(() => undefined)
    const tableSpy = vi
      .spyOn(console, 'table')
      .mockImplementation(() => undefined)

    const routes = server.dumpSupportedRoutes()

    expect(infoSpy).toHaveBeenCalledWith('Supported routes:')
    expect(tableSpy).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ method: 'GET', path: '/health' }),
        expect.objectContaining({ method: 'GET', path: '/' }),
        expect.objectContaining({
          method: 'POST',
          path: '/{county}/{parish}/{holding}/bundles/{bundleId}/calf'
        })
      ])
    )
    expect(routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ method: 'GET', path: '/health' }),
        expect.objectContaining({ method: 'GET', path: '/' }),
        expect.objectContaining({
          method: 'POST',
          path: '/{county}/{parish}/{holding}/bundles/{bundleId}/calf'
        })
      ])
    )
  })
})

describe('log format mapping', () => {
  afterEach(() => {
    delete process.env.LOG_FORMAT
  })

  test('server.js maps LOG_FORMAT=pretty onto the logger pretty-print format', async () => {
    // Arrange
    process.env.LOG_FORMAT = 'pretty'
    vi.resetModules()

    // Act
    await import('./server.js')

    // Assert
    expect(logger.format).toBe('pretty-print')
  })

  test('server.js passes any other LOG_FORMAT value through to the logger unchanged', async () => {
    // Arrange
    process.env.LOG_FORMAT = 'ecs'
    vi.resetModules()

    // Act
    await import('./server.js')

    // Assert
    expect(logger.format).toBe('ecs')
  })
})
