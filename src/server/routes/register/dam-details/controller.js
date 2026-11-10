import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'

import { registrationClient } from '#server/services/registration-client.js'
import { calfPagePath } from '../paths.js'
import { validateDamDetails } from './validation.js'
import { buildViewModel } from './view-model.js'

const TEMPLATE = 'register/dam-details/index'
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
    const calf = { submissionId, animalId }
    const [calfDetails, damDetails] = await Promise.all([
      registrationClient.getCalfDetails(calf),
      registrationClient.getDamDetails(calf)
    ])

    // The calf's own details come first
    if (!calfDetails.earTagNumber) {
      return h.redirect(
        calfPagePath(cph, submissionId, animalId, 'calf-details')
      )
    }

    return h.view(
      TEMPLATE,
      buildViewModel({
        request,
        calfEarTagNumber: calfDetails.earTagNumber,
        damType: damDetails.damType ?? ''
      })
    )
  }
}

export const damDetailsSubmitController = {
  async handler(request, h) {
    const { cph, submissionId, animalId } = request.params
    const calf = { submissionId, animalId }
    const { damType } = request.payload
    const errors = validateDamDetails({ damType })

    if (errors.length) {
      const calfDetails = await registrationClient.getCalfDetails(calf)
      return h
        .view(
          TEMPLATE,
          buildViewModel({
            request,
            calfEarTagNumber: calfDetails.earTagNumber,
            damType,
            errors
          })
        )
        .code(statusCodes.badRequest)
    }

    await registrationClient.saveDamDetails({ ...calf, answers: { damType } })

    return h.redirect(
      calfPagePath(cph, submissionId, animalId, nextPageFor(damType))
    )
  }
}
