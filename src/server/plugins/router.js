import path from 'node:path'
import inert from '@hapi/inert'
import { createSpokeGuard, getHubJwtCookieOptions } from '@livestock/ui-services/auth'

import { home } from '../routes/home/index.js'
import { basic } from '../routes/basic/index.js'
import { dam } from '../routes/dam/index.js'
import { sire } from '../routes/sire/index.js'
import { summary } from '../routes/summary/index.js'
import { result } from '../routes/result/result.js'
import { health } from '../routes/health/index.js'

import { serveStaticFiles } from './serve-static-files.js'
import { createBasePathHelpersForConfig } from '@livestock/ui-services/base-path'
import { config } from '#config/config.js'

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
  secret: config.get('auth.hubJwt.secret'),
  issuer: config.get('auth.hubJwt.issuer'),
  audience: config.get('auth.hubJwt.audience')
})

export const router = {
  plugin: {
    name: 'router',
    async register(server) {
      await server.register([inert])
      await server.register([health])
      await server.register([
        authGuard,
        home,
        basic,
        dam,
        sire,
        summary,
        result])

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
