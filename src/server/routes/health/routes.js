import { healthController } from './controllers/health-controller.js'

export const routes = () => [
  {
    method: 'GET',
    path: '/health',
    ...healthController
  }
]
