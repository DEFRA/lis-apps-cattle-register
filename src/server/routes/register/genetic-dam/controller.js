import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'
import { formatEarTag } from '@defra/lis-infra-ui-services/nunjucks/filters'

import { registrationClient } from '#server/services/registration-client.js'
import { calfPagePath } from '../paths.js'
import { MAX_FIELD_LENGTH } from '../form-limits.js'
import { calfNotFound, registrationKey } from '../registration.js'
import { formErrors } from '../form-errors.js'
import { backLinkPath, keepReturn, pathAfterSave } from '../check-return.js'
import { getMessage } from './messages.js'

const TEMPLATE = 'register/genetic-dam/index'
const PAGE_TITLE = 'Genetic dam details'
const NEXT_PAGE = 'sire-details'

/**
 * @param {object} options
 * @param {object} options.request - with the saved calf in request.pre.calf
 * @param {string} options.earTagNumber
 * @param {{ field: string, code: string }[]} [options.errors]
 * @returns {object} the genetic dam view model
 */
function buildViewModel({ request, earTagNumber, errors = [] }) {
  const { cph, registrationId, calfNumber } = request.params
  const { errorList, fieldErrors } = formErrors(errors, getMessage)

  return {
    pageTitle: errors.length ? `Error: ${PAGE_TITLE}` : PAGE_TITLE,
    heading: PAGE_TITLE,
    calfEarTagNumber: formatEarTag(request.pre.calf.calfDetails.earTagNumber),
    backLinkHref: backLinkPath(
      request,
      calfNumber,
      calfPagePath(cph, registrationId, calfNumber, 'dam-details')
    ),
    formAction: keepReturn(
      request,
      calfPagePath(cph, registrationId, calfNumber, 'genetic-dam')
    ),
    values: { earTagNumber },
    maxFieldLength: MAX_FIELD_LENGTH,
    errorList,
    fieldErrors
  }
}

export const geneticDamController = {
  handler(request, h) {
    return h.view(
      TEMPLATE,
      buildViewModel({
        request,
        earTagNumber: request.pre.calf.geneticDam.earTagNumber ?? ''
      })
    )
  }
}

export const geneticDamSubmitController = {
  async handler(request, h) {
    const { cph, registrationId, calfNumber } = request.params
    const { earTagNumber } = request.payload
    const result = await registrationClient.saveGeneticDam({
      ...registrationKey(request),
      calfNumber,
      answers: { earTagNumber }
    })

    if (!result) {
      return calfNotFound(request, h)
    }

    const { errors } = result

    if (errors.length) {
      return h
        .view(TEMPLATE, buildViewModel({ request, earTagNumber, errors }))
        .code(statusCodes.badRequest)
    }

    return h.redirect(
      await pathAfterSave(
        request,
        calfNumber,
        calfPagePath(cph, registrationId, calfNumber, NEXT_PAGE)
      )
    )
  }
}
