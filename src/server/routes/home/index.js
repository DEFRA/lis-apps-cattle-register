import { getController } from '../controllers/home-controller.js'

export const home = {
  plugin: {
    name: 'home',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/',
          ...getController
        }
      ])
    }
  }
}
