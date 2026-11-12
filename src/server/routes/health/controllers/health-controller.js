/** @import { Request, ResponseObject, ResponseToolkit } from '@hapi/hapi' */

import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'

/**
 * A generic health-check endpoint. Used by the platform to check if the service is up and handling requests.
 */
export const healthController = {
  /**
   * Handles the request and returns the response.
   *
   * @param {Request} _request - the Hapi request (unused)
   * @param {ResponseToolkit} h - the Hapi response toolkit
   * @returns {ResponseObject} the response
   */
  handler(_request, h) {
    return h.response({ message: 'success' }).code(statusCodes.ok)
  }
}
