import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'

import { registrationClient } from '#server/services/registration-client.js'
import { calfPagePath } from '../paths.js'
import { trimAnswers } from '../validation/journey.js'
import { registration } from '../validation/registration.js'
import { buildViewModel } from './view-model.js'

const TEMPLATE = 'register/genetic-dam/index'
const PAGE = 'genetic-dam'
const NEXT_PAGE = 'sire-details'

export const geneticDamController = {
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
        geneticDamEarTagNumber: animal.geneticDamEarTagNumber ?? '',
        earTagItems
      })
    )
  }
}

export const geneticDamSubmitController = {
  async handler(request, h) {
    const { cph, submissionId, animalId } = request.params
    const calf = { submissionId, animalId }
    const values = trimAnswers({
      geneticDamEarTagNumber: request.payload.geneticDamEarTagNumber
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
            geneticDamEarTagNumber: values.geneticDamEarTagNumber,
            earTagItems,
            errors
          })
        )
        .code(statusCodes.badRequest)
    }

    await registrationClient.saveAnimal({
      ...calf,
      values: registration.withAnswers(PAGE, animal, values)
    })

    return h.redirect(calfPagePath(cph, submissionId, animalId, NEXT_PAGE))
  }
}
