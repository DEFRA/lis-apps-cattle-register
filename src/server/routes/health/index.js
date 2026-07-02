import { routes } from './routes.js'

export const health = {
  plugin: {
    name: 'health',
    register(server) {
      server.route(routes())
    }
  }
}
