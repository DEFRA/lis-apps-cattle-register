import {
  getController,
  postController
} from '../controllers/basic-controller.js'

export const basic = {
  plugin: {
    name: 'basic',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/basic',
          ...getController
        },
        {
          method: 'POST',
          path: '/basic',
          ...postController
        }
      ])
    }
  }
}
