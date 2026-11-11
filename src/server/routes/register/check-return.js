/*
 * A Change link on check calf details opens a page marked to return there.
 * The mark is one fixed word in the query, never a URL, so it cannot send
 * the user off the service.
 */
/** @import { Request } from '@hapi/hapi' */
import { calfPagePath } from './paths.js'
import { registration } from '#server/journeys/register/registration.js'

export const CHECK_PAGE = 'check-calf-details'
const RETURN_TO_CHECK = 'check'

/**
 * @param {Request} request
 * @returns {boolean} true when the page was reached from a Change link on
 *   check calf details
 */
export function isReturningToCheck(request) {
  return request.query?.return === RETURN_TO_CHECK
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
 * Where a page goes after a successful save. Normally the calf's next page,
 * or check calf details after its last. After a Change link, back to check
 * calf details, unless the change left a page unanswered (a changed dam type
 * clears the dams), in which case that page, still marked to return.
 * @param {Request} request
 * @param {string} page - the page that saved
 * @param {Record<string, string>} animal - the calf as saved
 * @returns {string} the path to redirect to
 */
export function pathAfterSave(request, page, animal) {
  const { cph, submissionId, animalId } = request.params

  if (!isReturningToCheck(request)) {
    return calfPagePath(
      cph,
      submissionId,
      animalId,
      registration.nextPage(page, animal) ?? CHECK_PAGE
    )
  }

  const unanswered = registration.firstUnansweredPage(animal)

  return unanswered
    ? withReturnToCheck(calfPagePath(cph, submissionId, animalId, unanswered))
    : calfPagePath(cph, submissionId, animalId, CHECK_PAGE)
}

/**
 * @param {Request} request
 * @param {string} previousPath - the previous page in the journey
 * @returns {string} check calf details after a Change link, otherwise the
 *   previous page
 */
export function backLinkPath(request, previousPath) {
  const { cph, submissionId, animalId } = request.params

  return isReturningToCheck(request)
    ? calfPagePath(cph, submissionId, animalId, CHECK_PAGE)
    : previousPath
}
