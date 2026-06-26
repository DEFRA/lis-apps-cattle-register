import process from 'node:process'

import { getLoggerForConfig } from '@livestock/ui-services/logging'

import { config } from '#config/config.js'
import { startServer } from '#server/common/helpers/start-server.js'

await startServer()

process.on('unhandledRejection', (error) => {
  const logger = getLoggerForConfig(config)
  logger.info('Unhandled rejection')
  logger.error(error)
  process.exitCode = 1
})
