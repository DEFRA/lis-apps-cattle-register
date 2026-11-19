import * as submissionClient from '#server/services/be4fe/submission.js'
import { submissionPagePath, submissionPath } from '../paths.js'
import { listCalves } from '../tag-list/controller.js'
import { buildViewModel } from './view-model.js'

/** @import { Request, ResponseObject, ResponseToolkit } from '@hapi/hapi' */

const TEMPLATE = 'register/submit/index'
// Not built yet: once sent, the registration continues with its
// confirmation.
const CONFIRMATION_PAGE = 'confirmation'

/**
 * A registration is sent once, and only when every calf in it is ready.
 * @param {{ cph: string, submissionId: string }} submission
 * @returns {Promise<string | undefined>} the path to go to instead of
 *   sending: the confirmation of a registration already sent, or the list of
 *   calves of one with no calf or an unfinished one; undefined for a
 *   registration ready to send
 */
async function pathInsteadOfSending({ cph, submissionId }) {
  const { status } = await submissionClient.getSubmission({
    cph,
    submissionId
  })

  if (status === submissionClient.SUBMITTED_STATUS) {
    return submissionPagePath(cph, submissionId, CONFIRMATION_PAGE)
  }

  const calves = await listCalves({ cph, submissionId })

  return calves.length && calves.every((calf) => calf.isReady)
    ? undefined
    : submissionPath(cph, submissionId)
}

export const submitRegistrationController = {
  /**
   * Handles the request and returns the response.
   *
   * @param {Request} request - the Hapi request
   * @param {ResponseToolkit} h - the Hapi response toolkit
   * @returns {Promise<ResponseObject>} the response
   */
  async handler(request, h) {
    const elsewhere = await pathInsteadOfSending(request.params)

    return elsewhere
      ? h.redirect(elsewhere)
      : h.view(TEMPLATE, buildViewModel({ request }))
  }
}

export const submitRegistrationSubmitController = {
  /**
   * Handles the request and returns the response.
   *
   * @param {Request} request - the Hapi request
   * @param {ResponseToolkit} h - the Hapi response toolkit
   * @returns {Promise<ResponseObject>} the response
   */
  async handler(request, h) {
    const { cph, submissionId } = request.params
    const elsewhere = await pathInsteadOfSending(request.params)

    if (elsewhere) {
      return h.redirect(elsewhere)
    }

    // A failure to send is the service's problem page; the BE4FE keeps the
    // registration as it was, to send again.
    await submissionClient.submitRegistration({ cph, submissionId })

    return h.redirect(submissionPagePath(cph, submissionId, CONFIRMATION_PAGE))
  }
}
