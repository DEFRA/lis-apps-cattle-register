/** @import { Request, ResponseToolkit } from '@hapi/hapi' */
import Boom from '@hapi/boom'
import {
  PERMISSIONS,
  hasPermission
} from '@defra/lis-hubs-infra-access/authorization'

import * as registrationClient from '#server/services/registration-client.js'

// Admin is listed alongside write because some roles (caseworker-super)
// grant register admin without register write.
const REGISTER_PERMISSIONS = [
  PERMISSIONS.cattleRegisterWrite,
  PERMISSIONS.cattleRegisterAdmin
]

/**
 * Only a user granted cattle registration on the CPH in the path may
 * register on that holding.
 * @param {Request} request
 * @param {ResponseToolkit} h
 * @returns {symbol | Boom.Boom} h.continue when access is allowed, otherwise a 404
 */
export function demandRegisterAccess(request, h) {
  const { cph } = request.params
  const { user } = request.auth.credentials

  if (
    REGISTER_PERMISSIONS.some((permission) =>
      hasPermission(user, { permission, cph })
    )
  ) {
    return h.continue
  }

  // Not found rather than forbidden, so a holding's existence isn't
  // confirmed to someone not entitled to it.
  return Boom.notFound()
}

/**
 * Only a submission of the holding in the path may be reached through it:
 * the BE4FE finds a submission by its id alone. Runs after
 * demandRegisterAccess, which a route about a submission must also have.
 * @param {Request} request
 * @param {ResponseToolkit} h
 * @returns {Promise<symbol | Boom.Boom>} h.continue for one of the holding's
 *   submissions, otherwise a 404, as for a registration that does not exist
 */
export async function demandSubmissionOfHolding(request, h) {
  const { cph, submissionId } = request.params

  if (await registrationClient.hasSubmission({ cph, submissionId })) {
    return h.continue
  }

  return Boom.notFound()
}
