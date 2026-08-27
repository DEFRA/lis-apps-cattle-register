import { requestContext } from '@defra/lis-hubs-infra-core'

// Spokes only ever receive x-lis-* headers from a hub's own proxy, so it's
// safe (and necessary, for tenant log context) to trust them here - unlike
// a hub, which is the public-facing entry point and must not.
export const requestTracing = {
  plugin: requestContext.plugin,
  options: { trustLisHeaders: true }
}
