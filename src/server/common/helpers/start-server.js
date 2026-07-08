/** @import { Server } from '@hapi/hapi' */
import { createServer } from '../../server.js'
import { config } from '../../../config/config.js'

/**
 * @returns {Promise<Server>}
 */
async function startServer() {
  const server = await createServer()
  await server.start()

  if (!config.get('isTest')) {
    server.dumpSupportedRoutes()
  }

  server.logger.info('Server started successfully')
  server.logger.info(
    `Access your frontend on http://localhost:${config.get('port')}`
  )

  return server
}

export { startServer }
