import path from 'path'
import hapi from '@hapi/hapi'
import Scooter from '@hapi/scooter'
import {
  getLoggerForConfig,
  getRequestLoggerPluginForConfig
} from '@livestock/ui-services/logging'
import { createNunjucksConfig } from '@livestock/ui-services/nunjucks/plugin'

import { router } from './plugins/router.js'
import { config } from '#config/config.js'
import { pulse } from './plugins/pulse.js'
import { catchAll } from '@livestock/ui-services/errors'
import { createBasePathHelpersForConfig } from '@livestock/ui-services/base-path'
import { setupProxy } from '@livestock/ui-services/proxy/setup-proxy'
import { requestTracing } from './plugins/request-tracing.js'
import { createSessionCachePluginForConfig } from '@livestock/ui-services/session-cache'
import { getCacheEngine } from '@livestock/ui-services/session-cache/cache-engine'
import { secureContext } from '@defra/hapi-secure-context'
import { contentSecurityPolicy } from './plugins/content-security-policy.js'
import { metrics } from '@defra/cdp-metrics'

const logger = getLoggerForConfig(config)
const requestLogger = getRequestLoggerPluginForConfig(config)
const sessionCache = createSessionCachePluginForConfig(config)
const { getRequestBasePath } = createBasePathHelpersForConfig(config)
const nunjucksConfig = createNunjucksConfig({
  config,
  logger,
  getRequestBasePath
})

export async function createServer() {
  setupProxy({
    proxyUrl: config.get('httpProxy'),
    logger
  })
  const server = hapi.server({
    host: config.get('host'),
    port: config.get('port'),
    routes: {
      validate: {
        options: {
          abortEarly: false
        }
      },
      files: {
        relativeTo: path.resolve(config.get('root'), '.public')
      },
      security: {
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: false
        },
        xss: 'enabled',
        noSniff: true,
        xframe: true
      }
    },
    router: {
      stripTrailingSlash: true
    },
    cache: [
      {
        name: config.get('session.cache.name'),
        engine: getCacheEngine({
          engine: config.get('session.cache.engine'),
          config,
          logger
        })
      }
    ],
    state: {
      strictHeader: false
    }
  })
  await server.register([
    requestLogger,
    requestTracing,
    metrics,
    secureContext,
    pulse,
    sessionCache,
    nunjucksConfig,
    Scooter,
    contentSecurityPolicy,
    router
  ])

  server.ext('onPreResponse', catchAll)

  return server
}
