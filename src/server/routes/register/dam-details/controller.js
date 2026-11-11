import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'

import * as registrationClient from '#server/services/registration-client.js'
import { trimAnswers } from '@defra/lis-infra-ui-services/journey'
import { pathAfterSave } from '../check-return.js'
import { calfPagePath } from '../paths.js'
import { registration } from '#server/journeys/register/registration.js'
import { buildViewModel } from './view-model.js'

/** @import { Request, ResponseObject, ResponseToolkit } from '@hapi/hapi' */

const TEMPLATE = 'register/dam-details/index'
const PAGE = 'dam-details'
export const damDetailsController = {
  /**
   * Handles the request and returns the response.
   *
   * @param {Request} request - the Hapi request
   * @param {ResponseToolkit} h - the Hapi response toolkit
   * @returns {Promise<ResponseObject>} the response
   */
  async handler(request, h) {
    const { cph, submissionId, animalId } = request.params
    const animal = await registrationClient.getAnimal({
      submissionId,
      animalId
    })
    const owed = registration.pageOwed(PAGE, animal)

    if (owed) {
      return h.redirect(calfPagePath(cph, submissionId, animalId, owed))
    }

    return h.view(
      TEMPLATE,
      buildViewModel({
        request,
        calfEarTagNumber: animal.earTagNumber,
        damType: animal.damType ?? ''
      })
    )
  }
}

export const damDetailsSubmitController = {
  /**
   * Handles the request and returns the response.
   *
   * @param {Request} request - the Hapi request
   * @param {ResponseToolkit} h - the Hapi response toolkit
   * @returns {Promise<ResponseObject>} the response
   */
  async handler(request, h) {
    const { cph, submissionId, animalId } = request.params
    const calf = { submissionId, animalId }
    const { damType } = trimAnswers({ damType: request.payload.damType })
    const animal = await registrationClient.getAnimal(calf)
    const owed = registration.pageOwed(PAGE, animal)

    if (owed) {
      return h.redirect(calfPagePath(cph, submissionId, animalId, owed))
    }

    const { errors } = registration.validateStep(PAGE, animal, { damType })

    if (errors.length) {
      return h
        .view(
          TEMPLATE,
          buildViewModel({
            request,
            calfEarTagNumber: animal.earTagNumber,
            damType,
            errors
          })
        )
        .code(statusCodes.badRequest)
    }

    const saved = registration.withAnswers(PAGE, animal, { damType })
    await registrationClient.saveAnimal({ ...calf, values: saved })

    return h.redirect(pathAfterSave(request, PAGE, saved))
  }
}
