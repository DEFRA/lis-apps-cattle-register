/** @import { Request } from '@hapi/hapi' */
import Joi from 'joi'

import { registrationClient } from '#server/services/registration-client.js'
import { calfPagePath } from './paths.js'
import { firstIncompletePage, registrationKey } from './registration.js'

export const CHECK_PAGE = 'check-calf-details'
const RETURN_TO_CHECK = 'check'

/**
 * The query of a page that a Change link on check calf details can reach.
 * `return` names where to go back to from a fixed list, never a URL, so it
 * cannot send the user off the service.
 */
export const returnQuery = Joi.object({
  return: Joi.string().valid(RETURN_TO_CHECK)
}).unknown(true)

/**
 * @param {Request} request
 * @returns {boolean} true when the page was reached from a Change link on
 *   check calf details
 */
export function isReturningToCheck(request) {
  return request.query.return === RETURN_TO_CHECK
}

/**
 * @param {string} path
 * @returns {string} the path, marked as reached from check calf details
 */
export function withReturnToCheck(path) {
  return `${path}?return=${RETURN_TO_CHECK}`
}

/**
 * @param {Request} request
 * @param {string} path
 * @returns {string} the path, still marked as reached from check calf
 *   details when the request was
 */
export function keepReturn(request, path) {
  return isReturningToCheck(request) ? withReturnToCheck(path) : path
}

/**
 * Where a page goes after a successful save. Normally the next page in the
 * journey; after a Change link, back to check calf details, unless the change
 * left a page unanswered (a changed dam type clears the dam answers), in
 * which case the first such page, still marked to return.
 * @param {Request} request
 * @param {number} calfNumber
 * @param {string} nextPath - the next page in the journey
 * @returns {Promise<string>} the path to redirect to
 */
export async function pathAfterSave(request, calfNumber, nextPath) {
  if (!isReturningToCheck(request)) {
    return nextPath
  }

  const { cph, registrationId } = request.params
  const calf = await registrationClient.getCalf({
    ...registrationKey(request),
    calfNumber
  })
  const page = calf && firstIncompletePage(calf)

  return page
    ? withReturnToCheck(calfPagePath(cph, registrationId, calfNumber, page))
    : calfPagePath(cph, registrationId, calfNumber, CHECK_PAGE)
}

/**
 * @param {Request} request
 * @param {number} calfNumber
 * @param {string} previousPath - the previous page in the journey
 * @returns {string} check calf details after a Change link, otherwise the
 *   previous page
 */
export function backLinkPath(request, calfNumber, previousPath) {
  const { cph, registrationId } = request.params

  return isReturningToCheck(request)
    ? calfPagePath(cph, registrationId, calfNumber, CHECK_PAGE)
    : previousPath
}
