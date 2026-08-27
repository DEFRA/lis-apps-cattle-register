import process from 'node:process'

import { logger } from '@defra/lis-hubs-infra-core'

import { startServer } from '#server/common/helpers/start-server.js'

await startServer()

process.on('unhandledRejection', (error) => {
  logger.info('Unhandled rejection')
  logger.error(error)
  process.exitCode = 1
})
