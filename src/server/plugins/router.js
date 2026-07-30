import inert from '@hapi/inert'
import {
  createSpokeGuard,
  getHubJwtCookieOptions,
  createModuleAccessGuard
} from '@livestock/hubs-infra-access/auth'

import { health } from '../routes/health/index.js'
import { register } from '../routes/register/index.js'

import { serveStaticFiles } from './serve-static-files.js'
import { config } from '#config/config.js'
import { moduleAccess } from '../../../module-access.js'

const authGuard = createSpokeGuard({
  spokeId: 'cattle-register',
  hubOrigin: config.get('auth.hubOrigin'),
  hubOrigins: config.get('auth.hubOrigins'),
  cookieName: config.get('auth.hubJwt.cookieName'),
  cookieOptions: getHubJwtCookieOptions({
    ttlSeconds: config.get('auth.hubJwt.ttlSeconds'),
    isSecure: config.get('session.cookie.secure')
  }),
  assetPath: config.get('assetPath'),
  port: config.get('port'),
  basePath: config.get('basePath'),
  secret: config.get('auth.hubJwt.secret'),
  issuer: config.get('auth.hubJwt.trustedIssuers'),
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
      await server.register({
        ...register,
        options: { rootPath: '/' } // config.get('basePath') }
      })

      await server.register([authGuard, moduleAccessGuard])
      await server.register(serveStaticFiles)
    }
  }
}
