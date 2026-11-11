/** @import { Request, ResponseToolkit } from '@hapi/hapi' */
import Boom from '@hapi/boom'
import {
  PERMISSIONS,
  hasPermission
} from '@defra/lis-hubs-infra-access/authorization'

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
