import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

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
