import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'

import * as registrationClient from '#server/services/registration-client.js'
import { pathAfterSave } from '../check-return.js'
import { calfPagePath } from '../paths.js'
import { trimAnswers } from '#server/journeys/register/journey.js'
import { registration } from '#server/journeys/register/registration.js'
import { buildViewModel } from './view-model.js'

const TEMPLATE = 'register/surrogate-dam/index'
const PAGE = 'surrogate-dam'

export const surrogateDamController = {
  async handler(request, h) {
    const { cph, submissionId, animalId } = request.params
    const [animal, earTagItems] = await Promise.all([
      registrationClient.getAnimal({ submissionId, animalId }),
      registrationClient.getDamEarTags({ cph })
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
  async handler(request, h) {
    const { cph, submissionId, animalId } = request.params
    const calf = { submissionId, animalId }
    const values = trimAnswers({
      geneticDamEarTagNumber: request.payload.geneticDamEarTagNumber,
      surrogateDamEarTagNumber: request.payload.surrogateDamEarTagNumber
    })
    const [animal, earTagItems] = await Promise.all([
      registrationClient.getAnimal(calf),
      registrationClient.getDamEarTags({ cph })
    ])
    const owed = registration.pageOwed(PAGE, animal)

    if (owed) {
      return h.redirect(calfPagePath(cph, submissionId, animalId, owed))
    }

    const { errors } = registration.validateStep(PAGE, animal, values, {
      damEarTags: earTagItems
    })

    if (errors.length) {
      return h
        .view(
          TEMPLATE,
          buildViewModel({
            request,
            calfEarTagNumber: animal.earTagNumber,
            values,
            earTagItems,
            errors
          })
        )
        .code(statusCodes.badRequest)
    }

    const saved = registration.withAnswers(PAGE, animal, values)
    await registrationClient.saveAnimal({ ...calf, values: saved })

    return h.redirect(pathAfterSave(request, PAGE, saved))
  }
}
