import { routes } from './routes.js'

export const register = {
  plugin: {
    name: 'register',
    register(server, options = {}) {
      server.route(
        routes({
          ...options
        })
      )
    }
  }
}
