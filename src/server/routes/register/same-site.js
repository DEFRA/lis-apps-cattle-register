/** @import { Request, ResponseToolkit } from '@hapi/hapi' */
import Boom from '@hapi/boom'
import { isSameSiteRequest } from '@defra/lis-infra-ui-services/cookies'

/**
 * Refuses a form post sent from another site. There is no CSRF token in the
 * LIS stack: the hub session cookie is SameSite=Lax, and this checks the
 * browser's Sec-Fetch-Site or Origin header as well.
 * @param {Request} request
 * @param {ResponseToolkit} h
 * @returns {symbol | Boom.Boom}
 */
export function demandSameSitePost(request, h) {
  return isSameSiteRequest(request) ? h.continue : Boom.forbidden()
}
