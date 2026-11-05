/** @import { Request, ResponseToolkit } from '@hapi/hapi' */
import Boom from '@hapi/boom'

import { registrationClient } from '#server/services/registration-client.js'
import { registrationPagePath } from './paths.js'

/**
 * The id of the signed-in user. A user without one is refused, so that two
 * such users can never share a registration.
 * @param {Request} request
 * @returns {string} the user id
 * @throws {Boom.Boom} a 404, as for any registration the user cannot reach
 */
function demandUserId(request) {
  const userId = request.auth.credentials.user?.sub

  if (typeof userId !== 'string' || userId === '') {
    throw Boom.notFound()
  }

  return userId
}

/**
 * A registration belongs to the user who started it, on one holding.
 * @param {Request} request
 * @returns {{ cph: string, registrationId: string, userId: string }}
 */
export function registrationKey(request) {
  const { cph, registrationId } = request.params

  return {
    cph,
    registrationId,
    userId: demandUserId(request)
  }
}

/**
 * The response for a calf the registration does not have. Calf 1 is the
 * calf the calf details page enters, so until it is saved (or after its
 * draft has expired) the user is sent back there; any other missing calf is
 * a page that does not exist.
 * @param {Request} request
 * @param {ResponseToolkit} h
 * @returns {object} a redirect or a 404
 */
export function calfNotFound(request, h) {
  const { cph, registrationId, calfNumber } = request.params

  if (calfNumber === 1) {
    return h
      .redirect(registrationPagePath(cph, registrationId, 'calf-details'))
      .takeover()
  }

  return Boom.notFound()
}

/**
 * Route prerequisite for a page about one calf: the calf in the path must
 * have its calf details saved, otherwise see calfNotFound().
 * @param {Request} request
 * @param {ResponseToolkit} h
 * @returns {Promise<object>} the saved calf
 */
export async function loadCalf(request, h) {
  const calf = await registrationClient.getCalf({
    ...registrationKey(request),
    calfNumber: request.params.calfNumber
  })

  return calf ?? calfNotFound(request, h)
}
