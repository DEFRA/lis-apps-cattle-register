import { describe, expect, test, vi } from 'vitest'

import { register } from './index.js'
import { routes } from './routes.js'

describe('register plugin defaults', () => {
  test('builds routes with the default root path', () => {
    expect(routes()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ method: 'GET', path: '/' })
      ])
    )
  })

  test('normalizes a trailing slash on a custom root path', () => {
    expect(routes({ rootPath: '/custom/' })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ method: 'GET', path: '/custom' })
      ])
    )
  })

  test('registers routes when plugin options are omitted', () => {
    const server = { route: vi.fn(), ext: vi.fn() }

    register.plugin.register(server)

    expect(server.route).toHaveBeenCalledWith(expect.any(Array))
    expect(server.ext).toHaveBeenCalledWith(
      'onPreHandler',
      expect.any(Function)
    )
  })
})
