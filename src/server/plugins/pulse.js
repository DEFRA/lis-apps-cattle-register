import hapiPulse from 'hapi-pulse'
import { logger } from '@defra/lis-hubs-infra-core'
import { milliseconds } from '@defra/lis-infra-ui-services/duration'

const pulse = {
  plugin: hapiPulse,
  options: {
    logger,
    timeout: milliseconds.tenSeconds
  }
}

export { pulse }
