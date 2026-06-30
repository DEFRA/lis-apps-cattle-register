import {
  getController,
  postController
} from '../controllers/sire-controller.js'

export const sire = {
  plugin: {
    name: 'sire',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/sire',
          ...getController
        },
        {
          method: 'POST',
          path: '/sire',
          ...postController
        }
      ])
    }
  }
}
