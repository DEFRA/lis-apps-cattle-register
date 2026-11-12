/** @import { Server } from '@hapi/hapi' */

import { routes } from './routes.js'

export const health = {
  plugin: {
    name: 'health',
    /**
     * Registers the routes with the server.
     *
     * @param {Server} server - the Hapi server
     */
    register(server) {
      server.route(routes())
    }
  }
}
