import { ServiceRequestError } from '@defra/lis-hubs-infra-core'

/** @import { Request, ResponseToolkit, Lifecycle } from '@hapi/hapi' */

const CONFLICT = 409
const POST = 'post'

/**
 * The BE4FE answers a save that clashes with the one before it (a Continue
 * clicked twice, or a second tab) with a conflict, and the first save has
 * already been made. So a page that posts is shown again as the
 * registration now is, rather than as a failure.
 * @param {Request} request
 * @param {ResponseToolkit} h
 * @returns {Lifecycle.ReturnValue} a redirect to the page posted to, for a
 *   post the BE4FE answers with a conflict; otherwise h.continue
 */
export function redirectOnSaveConflict(request, h) {
  const { response } = request

  if (
    request.method !== POST ||
    !(response instanceof ServiceRequestError) ||
    response.statusCode !== CONFLICT
  ) {
    return h.continue
  }

  return h.redirect(`${request.url.pathname}${request.url.search}`)
}
