import inert from '@hapi/inert'
import { createSpokeAuth } from '@defra/lis-hubs-infra-access/authentication'

import { health } from '../routes/health/index.js'
import { register } from '../routes/register/index.js'

import { serveStaticFiles } from './serve-static-files.js'
import { config } from '#config/config.js'
import { moduleAccess } from '../../../module-access.js'

const spokeAuth = createSpokeAuth({
  spokeId: 'cattle-register',
  hubOrigins: config.get('auth.hubOrigins'),
  port: config.get('port'),
  secret: config.get('auth.hubJwt.secret'),
  audience: config.get('auth.hubJwt.audience'),
  moduleAccess
})

export const router = {
  plugin: {
    name: 'router',
    async register(server) {
      await server.register([inert, spokeAuth])
      await server.register([health, register])

      await server.register(serveStaticFiles)
    }
  }
}
