/** @import { Request, ResponseToolkit } from '@hapi/hapi' */
import Boom from '@hapi/boom'

import { registrationClient } from '#server/services/registration-client.js'
import { registrationPagePath } from './paths.js'

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
    userId: request.auth.credentials.user.sub
  }
}

/**
 * Route prerequisite for a page about one calf: the calf in the path must
 * have its calf details saved. Calf 1 is the calf the calf details page
 * enters, so until it is saved the user is sent back there; any other
 * missing calf is a page that does not exist.
 * @param {Request} request
 * @param {ResponseToolkit} h
 * @returns {Promise<object>} the saved calf
 */
export async function loadCalf(request, h) {
  const { cph, registrationId, calfNumber } = request.params
  const calf = await registrationClient.getCalf({
    ...registrationKey(request),
    calfNumber
  })

  if (calf) {
    return calf
  }

  if (calfNumber === 1) {
    return h
      .redirect(registrationPagePath(cph, registrationId, 'calf-details'))
      .takeover()
  }

  return Boom.notFound()
}
