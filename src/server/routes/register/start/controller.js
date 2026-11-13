import * as registrationClient from '#server/services/registration-client.js'
import { calfPagePath, newCalfPath } from '../paths.js'

/** @import { Request, ResponseObject, ResponseToolkit } from '@hapi/hapi' */

export const startRegistrationController = {
  /**
   * Handles the request and returns the response.
   *
   * @param {Request} request - the Hapi request
   * @param {ResponseToolkit} h - the Hapi response toolkit
   * @returns {Promise<ResponseObject>} the response
   */
  async handler(request, h) {
    const { cph } = request.params
    const { submissionId, animalId } =
      await registrationClient.startRegistration({ cph })

    return h.redirect(
      animalId
        ? calfPagePath(cph, submissionId, animalId, 'calf-details')
        : newCalfPath(cph, submissionId)
    )
  }
}
