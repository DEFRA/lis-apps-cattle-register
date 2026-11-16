import * as animalClient from '#server/services/be4fe/animal.js'
import * as dataClient from '#server/services/be4fe/data.js'
import { withReturnToCheck } from '../check-return.js'
import { calfPagePath, submissionPath } from '../paths.js'
import { registration } from '#server/journeys/register/registration.js'
import { buildViewModel } from './view-model.js'

/** @import { Request, ResponseObject, ResponseToolkit } from '@hapi/hapi' */

const TEMPLATE = 'register/check-calf-details/index'

export const checkCalfDetailsController = {
  /**
   * Handles the request and returns the response.
   *
   * @param {Request} request - the Hapi request
   * @param {ResponseToolkit} h - the Hapi response toolkit
   * @returns {Promise<ResponseObject>} the response
   */
  async handler(request, h) {
    const { cph, submissionId, animalId } = request.params
    const animal = await animalClient.getAnimal({
      cph,
      submissionId,
      animalId
    })
    const unanswered = registration.firstUnansweredPage(animal)

    if (unanswered) {
      return h.redirect(calfPagePath(cph, submissionId, animalId, unanswered))
    }

    return h.view(TEMPLATE, buildViewModel({ request, animal }))
  }
}

export const checkCalfDetailsSubmitController = {
  /**
   * Handles the request and returns the response.
   *
   * @param {Request} request - the Hapi request
   * @param {ResponseToolkit} h - the Hapi response toolkit
   * @returns {Promise<ResponseObject>} the response
   */
  async handler(request, h) {
    const { cph, submissionId, animalId } = request.params
    const [animal, unallocatedEarTags, damEarTags] = await Promise.all([
      animalClient.getAnimal({ cph, submissionId, animalId }),
      dataClient.getUnallocatedEarTags({ cph, submissionId }),
      dataClient.getDamEarTags({ cph })
    ])
    // Every answer was valid when it was saved, but the holding's ear tags
    // and dams may have changed since, so the calf is judged whole here.
    const incomplete = registration.firstIncompleteStep(animal, {
      unallocatedEarTags,
      damEarTags
    })

    if (incomplete) {
      return h.redirect(
        withReturnToCheck(
          calfPagePath(cph, submissionId, animalId, incomplete.page)
        )
      )
    }

    return h.redirect(submissionPath(cph, submissionId))
  }
}
