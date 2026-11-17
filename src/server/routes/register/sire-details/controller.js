import * as animalClient from '#server/services/be4fe/animal.js'
import { pathAfterSave } from '../check-return.js'
import { calfPagePath } from '../paths.js'
import { blankAsNull, trimAnswers } from '@defra/lis-infra-ui-services/journey'
import { registration } from '#server/journeys/register/registration.js'
import { buildViewModel, formValuesFrom } from './view-model.js'

/** @import { Request, ResponseObject, ResponseToolkit } from '@hapi/hapi' */

const TEMPLATE = 'register/sire-details/index'
const PAGE = 'sire-details'

export const sireDetailsController = {
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
    const owed = registration.pageOwed(PAGE, animal)

    if (owed) {
      return h.redirect(calfPagePath(cph, submissionId, animalId, owed))
    }

    return h.view(
      TEMPLATE,
      buildViewModel({
        request,
        calfEarTagNumber: animal.earTagNumber,
        values: formValuesFrom(animal),
        backPage: registration.previousPage(PAGE, animal)
      })
    )
  }
}

export const sireDetailsSubmitController = {
  /**
   * Handles the request and returns the response.
   *
   * @param {Request} request - the Hapi request
   * @param {ResponseToolkit} h - the Hapi response toolkit
   * @returns {Promise<ResponseObject>} the response
   */
  async handler(request, h) {
    const { cph, submissionId, animalId } = request.params
    const calf = { cph, submissionId, animalId }
    const values = blankAsNull(trimAnswers(formValuesFrom(request.payload)))
    const animal = await animalClient.getAnimal(calf)
    const owed = registration.pageOwed(PAGE, animal)

    if (owed) {
      return h.redirect(calfPagePath(cph, submissionId, animalId, owed))
    }

    // Both answers are optional and anything is taken for them, so there is
    // nothing to refuse.
    const saved = registration.withAnswers(PAGE, animal, values)
    await animalClient.saveAnimal({ ...calf, values: saved })

    return h.redirect(pathAfterSave(request, PAGE, saved))
  }
}
