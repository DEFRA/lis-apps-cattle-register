import { registerRoutes } from './routes.js'

export const register = {
  plugin: {
    name: 'register',
    registerRoutes(server) {
      server.route(routes())
    }
  }
}
