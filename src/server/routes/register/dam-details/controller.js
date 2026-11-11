import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'

import * as registrationClient from '#server/services/registration-client.js'
import { calfPagePath } from '../paths.js'
import { registration } from '#server/journeys/register/registration.js'
import { buildViewModel } from './view-model.js'

const TEMPLATE = 'register/dam-details/index'
const PAGE = 'dam-details'
const NEXT_PAGE_BY_DAM_TYPE = {
  genetic: 'genetic-dam',
  surrogate: 'surrogate-dam'
}

/**
 * @param {string} damType
 * @returns {string} the step that follows that dam type
 */
function nextPageFor(damType) {
  const nextPage = NEXT_PAGE_BY_DAM_TYPE[damType]

  if (!nextPage) {
    throw new Error(`No page follows dam type "${damType}"`)
  }

  return nextPage
}

export const damDetailsController = {
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
  async handler(request, h) {
    const { cph, submissionId, animalId } = request.params
    const calf = { submissionId, animalId }
    const { damType } = request.payload
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

    await registrationClient.saveAnimal({
      ...calf,
      values: registration.withAnswers(PAGE, animal, { damType })
    })

    return h.redirect(
      calfPagePath(cph, submissionId, animalId, nextPageFor(damType))
    )
  }
}
