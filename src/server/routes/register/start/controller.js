import { registrationClient } from '#server/services/registration-client.js'
import { calfPagePath } from '../paths.js'

export const startRegistrationController = {
  async handler(request, h) {
    const { cph } = request.params
    const { submissionId, animalId } =
      await registrationClient.startRegistration({ cph })

    return h.redirect(calfPagePath(cph, submissionId, animalId, 'calf-details'))
  }
}
