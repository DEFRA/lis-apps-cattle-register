import { afterEach, describe, expect, test, vi } from 'vitest'

describe('config environment defaults', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  test('uses production settings in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    const { config } = await import('./config.js?environment=production')

    expect(config.get('isProduction')).toBe(true)
    expect(['ecs', 'json']).toContain(config.get('log.format'))
    expect(config.get('log.redact')).toEqual([
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers'
    ])
    expect(config.get('isSecureContextEnabled')).toBe(true)
    expect(config.get('session.cache.engine')).toBe('redis')
    expect(config.get('session.cookie.secure')).toBe(true)
    expect(config.get('redis.useSingleInstanceCache')).toBe(false)
    expect(config.get('redis.useTLS')).toBe(true)
  })

  test('enables template reloading in development', async () => {
    vi.stubEnv('NODE_ENV', 'development')

    const { config } = await import('./config.js?environment=development')

    expect(config.get('isDevelopment')).toBe(true)
    expect(config.get('nunjucks.watch')).toBe(true)
    expect(config.get('nunjucks.noCache')).toBe(true)
  })
})
