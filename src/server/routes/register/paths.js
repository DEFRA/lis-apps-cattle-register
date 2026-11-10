import { getMountPath } from '@defra/lis-hubs-infra-registry'

export const REGISTER_ROUTE = '/holdings/{cph*3}/cattle/register'

/**
 * @param {string} cph
 * @param {string} submissionId
 * @param {string} page
 * @returns {string} the path of a page in one submission
 */
export function submissionPagePath(cph, submissionId, page) {
  return `${getMountPath('cattle-register', 'holding', { cph })}/${submissionId}/${page}`
}

/**
 * @param {string} cph
 * @returns {string} the path that starts, or continues, the holding's
 *   registration
 */
export function registerPath(cph) {
  return getMountPath('cattle-register', 'holding', { cph })
}
