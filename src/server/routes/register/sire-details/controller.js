import * as registrationClient from '#server/services/registration-client.js'
import { calfPagePath } from '../paths.js'
import { trimAnswers } from '#server/journeys/register/journey.js'
import { registration } from '#server/journeys/register/registration.js'
import { buildViewModel, formValuesFrom } from './view-model.js'

const TEMPLATE = 'register/sire-details/index'
const PAGE = 'sire-details'
// Not built yet (LREG-883 continues with checking the calf's details).
const NEXT_PAGE = 'check-calf-details'

export const sireDetailsController = {
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
        values: formValuesFrom(animal),
        backPage: registration.previousPage(PAGE, animal)
      })
    )
  }
}

export const sireDetailsSubmitController = {
  async handler(request, h) {
    const { cph, submissionId, animalId } = request.params
    const calf = { submissionId, animalId }
    const values = trimAnswers(formValuesFrom(request.payload))
    const animal = await registrationClient.getAnimal(calf)
    const owed = registration.pageOwed(PAGE, animal)

    if (owed) {
      return h.redirect(calfPagePath(cph, submissionId, animalId, owed))
    }

    // Both answers are optional and anything is taken for them, so there is
    // nothing to refuse.
    await registrationClient.saveAnimal({
      ...calf,
      values: registration.withAnswers(PAGE, animal, values)
    })

    return h.redirect(calfPagePath(cph, submissionId, animalId, NEXT_PAGE))
  }
}
