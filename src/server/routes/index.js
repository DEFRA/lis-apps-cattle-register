import { routes } from './routes.js'

export const registerCalf = {
  plugin: {
    name: 'registerCalf',
    register: async (server, options = {}) => {
      server.route(routes(options))
    }
  }
}
