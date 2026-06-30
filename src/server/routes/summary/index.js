import {
  getController,
  postController
} from '../controllers/summary-controller.js'

export const summary = {
  plugin: {
    name: 'summary',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/summary',
          ...getController
        },
        {
          method: 'POST',
          path: '/summary',
          ...postController
        }
      ])
    }
  }
}
