/** @import { ServerRoute } from '@hapi/hapi' */
import { healthController } from './controllers/health-controller.js'

/**
 * @returns {ServerRoute[]}
 */
export const routes = () => [
  {
    method: 'GET',
    path: '/health',
    ...healthController
  }
]
