import process from 'node:process'

import { logger } from '@defra/lis-hubs-infra-core'

import { startServer } from '#server/common/helpers/start-server.js'

// Registered before the server starts so a failure during startup is still
// reported through the logging framework rather than the console.
// An unhandled rejection is logged and marks the process for a non-zero exit,
// but the server keeps serving, matching the CDP template's behaviour.
process.on('unhandledRejection', (error) => {
  logger.error(error, 'Unhandled rejection')
  process.exitCode = 1
})

process.on('uncaughtException', (error) => {
  logger.fatal(error, 'Uncaught exception')
  process.exit(1)
})

try {
  await startServer()
} catch (error) {
  // Exit explicitly: clients created during createServer (e.g. Redis) would
  // otherwise keep the event loop alive with nothing listening.
  logger.fatal(error, 'Server failed to start')
  process.exit(1)
}
