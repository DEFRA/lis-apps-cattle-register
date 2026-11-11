import * as registrationClient from '#server/services/registration-client.js'
import { submissionPath } from '../paths.js'
import { buildViewModel } from './view-model.js'

const TEMPLATE = 'register/cancel/index'

export const cancelCalfController = {
  async handler(request, h) {
    const { cph, submissionId, animalId } = request.params
    const animal = await registrationClient.getAnimal({
      submissionId,
      animalId
    })

    // Nothing saved is nothing to cancel: a calf not yet started, or one
    // already cancelled.
    if (animal.earTagNumber === undefined) {
      return h.redirect(submissionPath(cph, submissionId))
    }

    return h.view(TEMPLATE, buildViewModel({ request, animal }))
  }
}

export const cancelCalfSubmitController = {
  async handler(request, h) {
    const { cph, submissionId, animalId } = request.params

    await registrationClient.removeAnimal({ submissionId, animalId })

    return h.redirect(submissionPath(cph, submissionId))
  }
}
