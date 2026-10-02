import { defineConfig, configDefaults } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    clearMocks: true,
    // createSpokeAuth requires these at construction; the JWKS is only
    // fetched when a service token is verified, which route tests bypass.
    env: {
      CDP_JWT_ISSUER: 'https://fake-sts.test',
      CDP_JWT_JWKS_URI: 'https://fake-sts.test/.well-known/jwks.json'
    },
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.js'],
      exclude: [
        ...configDefaults.exclude,
        '.public',
        'coverage',
        'postcss.config.js',
        'stylelint.config.js',
        'vitest.config.js',
        '.sonarlint',
        'babel.config.cjs'
      ]
    }
  }
})
