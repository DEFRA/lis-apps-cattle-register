import { describe, expect, test, vi } from 'vitest'

import { register } from './index.js'
import { routes } from './routes.js'

describe('register plugin defaults', () => {
  test('builds routes under the holding mount', () => {
    expect(routes()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          method: 'GET',
          path: '/holdings/{cph*3}/cattle/register'
        })
      ])
    )
  })

  test('does not register a landing page without a CPH', () => {
    expect(routes()).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ path: '/' })])
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
