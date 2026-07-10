import hapiPulse from 'hapi-pulse'
import { getLoggerForConfig } from '@livestock/ui-services/logging'
import { milliseconds } from '@livestock/ui-services/duration'

import { config } from '#config/config.js'

const pulse = {
  plugin: hapiPulse,
  options: {
    logger: getLoggerForConfig(config),
    timeout: milliseconds.tenSeconds
  }
}

export { pulse }
