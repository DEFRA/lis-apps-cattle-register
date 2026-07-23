/* eslint-disable jsdoc/require-jsdoc, no-magic-numbers */
import { buildMicrositePath } from '@livestock/ui-services'
import { taxonomy } from '@livestock/taxonomy-register'
import { species } from '@livestock/species-cattle'

export const ROOT_PATH = buildMicrositePath(taxonomy.id, species.id)
export const CPH_ROUTE = '{county}/{parish}/{holding}'

export function cphFromParams({ county, parish, holding } = {}) {
  return county && parish && holding ? `${county}/${parish}/${holding}` : null
}

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
  return `${ROOT_PATH}/${cphPath(cph)}`
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
