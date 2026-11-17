import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'

import * as animalClient from '#server/services/be4fe/animal.js'
import * as dataClient from '#server/services/be4fe/data.js'
import { pathAfterSave } from '../check-return.js'
import { calfPagePath } from '../paths.js'
import { blankAsNull, trimAnswers } from '@defra/lis-infra-ui-services/journey'
import { registration } from '#server/journeys/register/registration.js'
import { buildViewModel } from './view-model.js'

/** @import { Request, ResponseObject, ResponseToolkit } from '@hapi/hapi' */

const TEMPLATE = 'register/surrogate-dam/index'
const PAGE = 'surrogate-dam'

export const surrogateDamController = {
  /**
   * Handles the request and returns the response.
   *
   * @param {Request} request - the Hapi request
   * @param {ResponseToolkit} h - the Hapi response toolkit
   * @returns {Promise<ResponseObject>} the response
   */
  async handler(request, h) {
    const { cph, submissionId, animalId } = request.params
    const [animal, earTagItems] = await Promise.all([
      animalClient.getAnimal({ cph, submissionId, animalId }),
      dataClient.getDamEarTags({ cph })
    ])
    const owed = registration.pageOwed(PAGE, animal)

    if (owed) {
      return h.redirect(calfPagePath(cph, submissionId, animalId, owed))
    }

    return h.view(
      TEMPLATE,
      buildViewModel({
        request,
        calfEarTagNumber: animal.earTagNumber,
        values: {
          geneticDamEarTagNumber: animal.geneticDamEarTagNumber ?? '',
          surrogateDamEarTagNumber: animal.surrogateDamEarTagNumber ?? ''
        },
        earTagItems
      })
    )
  }
}

export const surrogateDamSubmitController = {
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
    // The genetic dam may be left out, and is then held as null
    const values = {
      ...blankAsNull(
        trimAnswers({
          geneticDamEarTagNumber: request.payload.geneticDamEarTagNumber
        })
      ),
      ...trimAnswers({
        surrogateDamEarTagNumber: request.payload.surrogateDamEarTagNumber
      })
    }
    const [animal, dam] = await Promise.all([
      animalClient.getAnimal(calf),
      values.surrogateDamEarTagNumber
        ? dataClient.getDam({
            cph,
            earTagNumber: values.surrogateDamEarTagNumber
          })
        : undefined
    ])
    const owed = registration.pageOwed(PAGE, animal)

    if (owed) {
      return h.redirect(calfPagePath(cph, submissionId, animalId, owed))
    }

    const { errors } = registration.validateStep(PAGE, animal, values, {
      dam
    })

    if (errors.length) {
      const earTagItems = await dataClient.getDamEarTags({ cph })

      return h
        .view(
          TEMPLATE,
          buildViewModel({
            request,
            calfEarTagNumber: animal.earTagNumber,
            values: {
              ...values,
              geneticDamEarTagNumber: values.geneticDamEarTagNumber ?? ''
            },
            earTagItems,
            errors
          })
        )
        .code(statusCodes.badRequest)
    }

    // Saved as the holding's animal has it, however it was typed
    const saved = registration.withAnswers(PAGE, animal, {
      ...values,
      surrogateDamEarTagNumber: dam.earTagNumber
    })
    await animalClient.saveAnimal({ ...calf, values: saved })

    return h.redirect(pathAfterSave(request, PAGE, saved))
  }
}
