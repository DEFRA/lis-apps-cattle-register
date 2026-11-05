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

  test('Should log supported routes through the logger', () => {
    const infoSpy = vi.fn()
    vi.spyOn(logger, 'info', 'get').mockReturnValue(infoSpy)

    const routes = server.dumpSupportedRoutes()

    expect(infoSpy).toHaveBeenCalledWith(
      {
        routes: expect.arrayContaining([
          expect.objectContaining({ method: 'GET', path: '/health' })
        ])
      },
      'Supported routes'
    )
    expect(routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ method: 'GET', path: '/health' })
      ])
    )
  })
})

describe('#dumpSupportedRoutes', () => {
  let server

  beforeEach(async () => {
    server = await createServer()
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await server.stop({ timeout: 0 })
  })

  test('it lists routes by path, then by method for routes sharing a path', () => {
    // Arrange
    vi.spyOn(logger, 'info', 'get').mockReturnValue(vi.fn())
    const handler = () => 'ok'
    server.route([
      { method: 'POST', path: '/a-shared-path', handler },
      { method: 'GET', path: '/a-shared-path', handler }
    ])

    // Act
    const routes = server.dumpSupportedRoutes()

    // Assert
    expect(routes.slice(0, 2)).toEqual([
      { method: 'GET', path: '/a-shared-path' },
      { method: 'POST', path: '/a-shared-path' }
    ])
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
    const { logger: serverLogger } = await import('@defra/lis-hubs-infra-core')

    // Assert
    expect(serverLogger.format).toBe('pretty-print')
  })

  test('server.js passes any other LOG_FORMAT value through to the logger unchanged', async () => {
    // Arrange
    process.env.LOG_FORMAT = 'ecs'
    vi.resetModules()

    // Act
    await import('./server.js')
    const { logger: serverLogger } = await import('@defra/lis-hubs-infra-core')

    // Assert
    expect(serverLogger.format).toBe('ecs')
  })
})
