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
 * @param {string} animalId - the calf's id in the submission: its ear tag
 *   number
 * @param {string} page
 * @returns {string} the path of a page about one calf in a submission
 */
export function calfPagePath(cph, submissionId, animalId, page) {
  return `${registerPath(cph)}/${submissionId}/calves/${encodeURIComponent(animalId)}/${page}`
}

/**
 * @param {string} cph
 * @param {string} submissionId
 * @returns {string} the path of the calf details page for a calf the
 *   submission does not have yet
 */
export function newCalfPath(cph, submissionId) {
  return `${registerPath(cph)}/${submissionId}/calves/calf-details`
}
