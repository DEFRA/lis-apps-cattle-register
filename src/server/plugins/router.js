import path from 'node:path'
import inert from '@hapi/inert'
import {
  createSpokeGuard,
  getHubJwtCookieOptions,
  createModuleAccessGuard
} from '@livestock/hubs-infra-access/auth'

import { health } from '../routes/health/index.js'
import { register } from '../routes/register/index.js'

import { serveStaticFiles } from './serve-static-files.js'
import { createBasePathHelpersForConfig } from '@livestock/ui-services/base-path'
import { config } from '#config/config.js'
import { moduleAccess } from '../../../module-access.js'

const { getAssetPaths } = createBasePathHelpersForConfig(config)

const authGuard = createSpokeGuard({
  spokeId: path.basename(config.get('root')),
  hubOrigin: config.get('auth.hubOrigin'),
  cookieName: config.get('auth.hubJwt.cookieName'),
  cookieOptions: getHubJwtCookieOptions({
    ttlSeconds: config.get('auth.hubJwt.ttlSeconds'),
    isSecure: config.get('session.cookie.secure')
  }),
  assetPath: config.get('assetPath'),
  port: config.get('port'),
  basePath: config.get('basePath'),
  secret: config.get('auth.hubJwt.secret'),
  issuer: config.get('auth.hubJwt.issuer'),
  audience: config.get('auth.hubJwt.audience')
})

const moduleAccessGuard = createModuleAccessGuard({
  assetPath: config.get('assetPath'),
  moduleAccess
})

export const router = {
  plugin: {
    name: 'router',
    async register(server) {
      await server.register([inert])
      await server.register([health])
      await server.register([register])

      await server.register([authGuard, moduleAccessGuard])

      if (!config.get('isProduction') && !config.get('isTest')) {
        await (async () => {
          const createViteServer = (await import('vite')).createServer
          const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'custom'
          })

          const connectPlugin = (await import('@defra/hapi-connect')).default

          for (const assetPath of getAssetPaths()) {
            await server.register({
              plugin: {
                ...connectPlugin,
                name: `connect-${assetPath.replaceAll('/', '-').replace(/^-+/, '') || 'root'}`
              },
              options: {
                path: assetPath,
                middleware: [vite.middlewares]
              }
            })
          }
        })()
      } else {
        server.register(serveStaticFiles)
      }
    }
  }
}
