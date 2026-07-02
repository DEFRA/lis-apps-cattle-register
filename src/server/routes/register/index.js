import { buildMicrositePath } from '@livestock/ui-services'
import { taxonomy } from '@livestock/taxonomy-register'
import { species } from '@livestock/species-cattle'

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
