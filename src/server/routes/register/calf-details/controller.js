import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'

import { registrationClient } from '#server/services/registration-client.js'
import { trimAnswers } from '../validation/journey.js'
import { registration } from '../validation/registration.js'
import { calfPagePath } from '../paths.js'
import { buildViewModel, formValuesFrom } from './view-model.js'

const TEMPLATE = 'register/calf-details/index'
const PAGE = 'calf-details'

export const calfDetailsController = {
  async handler(request, h) {
    const { cph, submissionId, animalId } = request.params
    const [animal, earTagItems] = await Promise.all([
      registrationClient.getAnimal({ submissionId, animalId }),
      registrationClient.getUnallocatedEarTags({ cph, submissionId })
    ])

    return h.view(
      TEMPLATE,
      buildViewModel({
        request,
        values: formValuesFrom(animal),
        earTagItems
      })
    )
  }
}

export const calfDetailsSubmitController = {
  async handler(request, h) {
    const { cph, submissionId, animalId } = request.params
    const { acknowledgedLateDateOfBirth, ...submitted } = request.payload
    const calf = { submissionId, animalId }
    const values = trimAnswers(formValuesFrom(submitted))
    const [animal, earTagItems] = await Promise.all([
      registrationClient.getAnimal(calf),
      registrationClient.getUnallocatedEarTags({ cph, submissionId })
    ])
    const { errors, warnings } = registration.validateStep(
      PAGE,
      animal,
      values,
      {
        unallocatedEarTags: earTagItems
      }
    )

    // The late-birth warning is shown once for a date: the page then carries
    // that date in a hidden field, and posting the same date again continues.
    // A changed date is warned about again.
    const isAcknowledged =
      acknowledgedLateDateOfBirth !== '' &&
      acknowledgedLateDateOfBirth === values.dateOfBirth
    const warningsToShow = errors.length || isAcknowledged ? [] : warnings

    if (errors.length || warningsToShow.length) {
      return h
        .view(
          TEMPLATE,
          buildViewModel({
            request,
            values,
            earTagItems,
            errors,
            warnings: warningsToShow,
            acknowledgedLateDateOfBirth:
              isAcknowledged || warningsToShow.length ? values.dateOfBirth : ''
          })
        )
        .code(errors.length ? statusCodes.badRequest : statusCodes.ok)
    }

    await registrationClient.saveAnimal({
      ...calf,
      values: registration.withAnswers(PAGE, animal, values)
    })

    return h.redirect(calfPagePath(cph, submissionId, animalId, 'dam-details'))
  }
}
