import { getController } from '../controllers/result-controller.js'

export const result = {
  plugin: {
    name: 'result',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/result',
          ...getController
        }
      ])
    }
  }
}
