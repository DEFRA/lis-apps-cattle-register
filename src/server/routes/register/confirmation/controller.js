import { getMountPath } from '@defra/lis-hubs-infra-registry'

import { isNotFound } from '#server/services/be4fe/client.js'
import * as submissionClient from '#server/services/be4fe/submission.js'
import { buildViewModel } from './view-model.js'

/** @import { Request, ResponseObject, ResponseToolkit } from '@hapi/hapi' */

const TEMPLATE = 'register/confirmation/index'

/**
 * @param {{ cph: string, submissionId: string }} submission
 * @returns {Promise<number | undefined>} how many calves the registration
 *   sent; undefined for one that has not been sent, or that there is not
 */
async function sentCalfCount({ cph, submissionId }) {
  try {
    const { status, animals } = await submissionClient.getSubmission({
      cph,
      submissionId
    })

    return status === submissionClient.SUBMITTED_STATUS
      ? animals.length
      : undefined
  } catch (error) {
    if (isNotFound(error)) {
      return undefined
    }

    throw error
  }
}

export const confirmationController = {
  /**
   * Handles the request and returns the response.
   *
   * @param {Request} request - the Hapi request
   * @param {ResponseToolkit} h - the Hapi response toolkit
   * @returns {Promise<ResponseObject>} the response
   */
  async handler(request, h) {
    const { cph } = request.params
    const calfCount = await sentCalfCount(request.params)

    // Nothing sent is nothing to confirm: on to the holding's cattle
    return calfCount === undefined
      ? h.redirect(`${getMountPath('cattle-home', 'holding', { cph })}/animals`)
      : h.view(TEMPLATE, buildViewModel({ request, calfCount }))
  }
}
