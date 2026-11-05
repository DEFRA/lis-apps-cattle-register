import { getMountPath } from '@defra/lis-hubs-infra-registry'

export const REGISTER_ROUTE = '/holdings/{cph*3}/cattle/register'

/**
 * @param {string} cph
 * @param {string} registrationId
 * @param {string} page
 * @returns {string} the path of a page in one registration
 */
export function registrationPagePath(cph, registrationId, page) {
  return `${getMountPath('cattle-register', 'holding', { cph })}/${registrationId}/${page}`
}
