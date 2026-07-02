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
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const tableSpy = vi.spyOn(console, 'table').mockImplementation(() => {})

    const routes = server.dumpSupportedRoutes()

    expect(infoSpy).toHaveBeenCalledWith('Supported routes:')
    expect(tableSpy).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ method: 'GET', path: '/health' }),
        expect.objectContaining({ method: 'GET', path: '/cattle/register' }),
        expect.objectContaining({ method: 'POST', path: '/cattle/register/calf' })
      ])
    )
    expect(routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ method: 'GET', path: '/health' }),
        expect.objectContaining({ method: 'GET', path: '/cattle/register' }),
        expect.objectContaining({ method: 'POST', path: '/cattle/register/calf' })
      ])
    )
  })
})
