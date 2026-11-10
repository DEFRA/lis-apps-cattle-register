import { registrationClient } from '#server/services/registration-client.js'
import { submissionPagePath } from '../paths.js'

export const startRegistrationController = {
  async handler(request, h) {
    const { cph } = request.params
    const { submissionId } = await registrationClient.startRegistration({
      cph
    })

    return h.redirect(submissionPagePath(cph, submissionId, 'calf-details'))
  }
}
