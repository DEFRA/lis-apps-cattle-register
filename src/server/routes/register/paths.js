import { getMountPath } from '@defra/lis-hubs-infra-registry'

export const REGISTER_ROUTE = '/holdings/{cph*3}/cattle/register'

/**
 * @param {string} cph
 * @returns {string} the path that starts, or continues, the holding's
 *   registration
 */
export function registerPath(cph) {
  return getMountPath('cattle-register', 'holding', { cph })
}

/**
 * @param {string} cph
 * @param {string} submissionId
 * @param {string} page
 * @returns {string} the path of a page about a whole submission
 */
export function submissionPagePath(cph, submissionId, page) {
  return `${registerPath(cph)}/${submissionId}/${page}`
}

/**
 * @param {string} cph
 * @param {string} submissionId
 * @param {string} animalId - the calf's id in the submission
 * @param {string} page
 * @returns {string} the path of a page about one calf in a submission
 */
export function calfPagePath(cph, submissionId, animalId, page) {
  return `${registerPath(cph)}/${submissionId}/calves/${animalId}/${page}`
}
