import { randomUUID } from 'node:crypto'

import { registrationPagePath } from '../paths.js'

export const startRegistrationController = {
  handler(request, h) {
    return h.redirect(
      registrationPagePath(request.params.cph, randomUUID(), 'calf-details')
    )
  }
}
