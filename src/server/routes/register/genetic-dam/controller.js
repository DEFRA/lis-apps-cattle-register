import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'

import { registrationClient } from '#server/services/registration-client.js'
import { calfPagePath } from '../paths.js'
import { validateGeneticDam } from './validation.js'
import { buildViewModel } from './view-model.js'

const TEMPLATE = 'register/genetic-dam/index'
const GENETIC = 'genetic'
// Not built yet (LREG-897 continues with sire details).
const NEXT_PAGE = 'sire-details'

export const geneticDamController = {
  async handler(request, h) {
    const { cph, submissionId, animalId } = request.params
    const calf = { submissionId, animalId }
    const [calfDetails, damDetails, geneticDam, earTagItems] =
      await Promise.all([
        registrationClient.getCalfDetails(calf),
        registrationClient.getDamDetails(calf),
        registrationClient.getGeneticDam(calf),
        registrationClient.getDamEarTags({ cph })
      ])

    // The page is for a calf born via its genetic dam
    if (damDetails.damType !== GENETIC) {
      return h.redirect(
        calfPagePath(cph, submissionId, animalId, 'dam-details')
      )
    }

    return h.view(
      TEMPLATE,
      buildViewModel({
        request,
        calfEarTagNumber: calfDetails.earTagNumber,
        earTagNumber: geneticDam.earTagNumber ?? '',
        earTagItems
      })
    )
  }
}

export const geneticDamSubmitController = {
  async handler(request, h) {
    const { cph, submissionId, animalId } = request.params
    const calf = { submissionId, animalId }
    const answers = { earTagNumber: request.payload.earTagNumber.trim() }
    const earTagItems = await registrationClient.getDamEarTags({ cph })
    const errors = validateGeneticDam(answers, earTagItems)

    if (errors.length) {
      const calfDetails = await registrationClient.getCalfDetails(calf)
      return h
        .view(
          TEMPLATE,
          buildViewModel({
            request,
            calfEarTagNumber: calfDetails.earTagNumber,
            earTagNumber: answers.earTagNumber,
            earTagItems,
            errors
          })
        )
        .code(statusCodes.badRequest)
    }

    await registrationClient.saveGeneticDam({ ...calf, answers })

    return h.redirect(calfPagePath(cph, submissionId, animalId, NEXT_PAGE))
  }
}
