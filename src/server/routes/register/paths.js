/* eslint-disable jsdoc/require-jsdoc, no-magic-numbers */
import { getMountPath } from '@defra/lis-hubs-infra-registry'

export const HOLDING_ROUTE = '/holdings/{cph*3}/cattle/register'

export function cphPath(cph) {
  const segments = cph?.split('/') ?? []
  if (
    segments.length !== 3 ||
    !/^\d{2}$/.test(segments[0]) ||
    !/^\d{3}$/.test(segments[1]) ||
    !/^\d{4}$/.test(segments[2])
  ) {
    throw new Error(`Invalid CPH: ${cph}`)
  }
  return segments.join('/')
}

export function holdingRoot(cph) {
  return getMountPath('cattle-register', 'holding', { cph: cphPath(cph) })
}

export function bundlesRoot(cph) {
  return `${holdingRoot(cph)}/bundles`
}

export function bundleRoot(cph, bundleId) {
  return `${bundlesRoot(cph)}/${encodeURIComponent(bundleId)}`
}

export function bundlePath(cph, bundleId, page) {
  return `${bundleRoot(cph, bundleId)}/${page}`
}
