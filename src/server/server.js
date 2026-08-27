/** @import { Server } from '@hapi/hapi' */
import path from 'path'
import hapi from '@hapi/hapi'
import Scooter from '@hapi/scooter'
import { logger } from '@defra/lis-hubs-infra-core'
import { createNunjucksConfig } from '@defra/lis-infra-ui-services/nunjucks/plugin'

import { router } from './plugins/router.js'
import { config } from '#config/config.js'
import { pulse } from './plugins/pulse.js'
import { catchAll } from '@defra/lis-infra-ui-services/errors'
import { createBasePathHelpersForConfig } from '@defra/lis-infra-ui-services/base-path'
import { setupProxy } from '@defra/lis-infra-ui-services/proxy/setup-proxy'
import { requestTracing } from './plugins/request-tracing.js'
import { createSessionCachePluginForConfig } from '@defra/lis-infra-ui-services/session-cache'
import { getCacheEngine } from '@defra/lis-infra-ui-services/session-cache/cache-engine'
import { secureContext } from '@defra/hapi-secure-context'
import { contentSecurityPolicy } from './plugins/content-security-policy.js'
import { metrics } from '@defra/cdp-metrics'

logger.level = config.get('log.level')
logger.enabled = config.get('log.enabled')
logger.format =
  config.get('log.format') === 'pino-pretty'
    ? 'pretty-print'
    : config.get('log.format')
logger.serviceName = 'lis-apps-cattle-register'
logger.serviceVersion = config.get('serviceVersion')
const requestLogger = logger.hapiPlugin
const sessionCache = createSessionCachePluginForConfig(config)
const moduleId = 'cattle-register'
const { getRequestBasePath } = createBasePathHelpersForConfig({
  moduleId,
  assetPath: config.get('assetPath')
})
const nunjucksConfig = createNunjucksConfig({
  config,
  logger,
  getRequestBasePath,
  moduleId
})

function getSupportedRoutes(server) {
  return server
    .table()
    .map(({ method, path: routePath }) => ({
      method: method.toUpperCase(),
      path: routePath
    }))
    .sort(
      (left, right) =>
        left.path.localeCompare(right.path) ||
        left.method.localeCompare(right.method)
    )
}

function dumpSupportedRoutes() {
  const routes = getSupportedRoutes(this)

  console.info('Supported routes:')
  console.table(routes)

  return routes
}

/**
 * @returns {Promise<Server>}
 */
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

  server.decorate('server', 'dumpSupportedRoutes', dumpSupportedRoutes)
  server.ext('onPreResponse', catchAll)

  return server
}
