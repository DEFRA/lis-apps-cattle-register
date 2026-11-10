import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'

import { registrationClient } from '#server/services/registration-client.js'
import { registerPath, submissionPagePath } from '../paths.js'
import { trimAnswers, validateCalfDetails } from './validation.js'
import { buildViewModel, formValuesFrom } from './view-model.js'

const TEMPLATE = 'register/calf-details/index'

export const calfDetailsController = {
  async handler(request, h) {
    const { cph, submissionId } = request.params
    const calfDetails = await registrationClient.getCalfDetails({
      cph,
      submissionId
    })

    // A submission that is not the holding's current draft: start over
    if (!calfDetails) {
      return h.redirect(registerPath(cph))
    }

    const earTagItems = await registrationClient.getUnallocatedEarTags({
      cph,
      submissionId
    })

    return h.view(
      TEMPLATE,
      buildViewModel({
        request,
        values: formValuesFrom(calfDetails.answers),
        earTagItems
      })
    )
  }
}

export const calfDetailsSubmitController = {
  async handler(request, h) {
    const { cph, submissionId } = request.params
    const { acknowledgedLateDateOfBirth, ...submitted } = request.payload
    const values = trimAnswers(formValuesFrom(submitted))
    const { errors, warnings } = validateCalfDetails(values, new Date())

    // The late-birth warning is shown once for a date: the page then carries
    // that date in a hidden field, and posting the same date again continues.
    // A changed date is warned about again.
    const isAcknowledged =
      acknowledgedLateDateOfBirth !== '' &&
      acknowledgedLateDateOfBirth === values.dateOfBirth
    const warningsToShow = errors.length || isAcknowledged ? [] : warnings

    if (errors.length || warningsToShow.length) {
      const earTagItems = await registrationClient.getUnallocatedEarTags({
        cph,
        submissionId
      })
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

    const saved = await registrationClient.saveCalfDetails({
      cph,
      submissionId,
      answers: values
    })

    if (!saved) {
      return h.redirect(registerPath(cph))
    }

    return h.redirect(submissionPagePath(cph, submissionId, 'dam-details'))
  }
}
