import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'
import { formatEarTag } from '@defra/lis-infra-ui-services/nunjucks/filters'

import { registrationClient } from '#server/services/registration-client.js'
import { calfPagePath } from '../paths.js'
import { MAX_FIELD_LENGTH } from '../form-limits.js'
import { calfNotFound, registrationKey } from '../registration.js'
import { formErrors } from '../form-errors.js'
import { backLinkPath, keepReturn, pathAfterSave } from '../check-return.js'
import { getMessage } from './messages.js'

const TEMPLATE = 'register/surrogate-dam/index'
const PAGE_TITLE = 'Genetic and surrogate dam details'
const FIELDS = ['geneticDamEarTagNumber', 'surrogateDamEarTagNumber']
const NEXT_PAGE = 'sire-details'

/**
 * @param {object} answers
 * @returns {Record<string, string>} each field's answer, blank when absent
 */
function formValuesFrom(answers) {
  return Object.fromEntries(
    FIELDS.map((field) => [field, answers[field] ?? ''])
  )
}

/**
 * @param {object} options
 * @param {object} options.request - with the saved calf in request.pre.calf
 * @param {Record<string, string>} options.values
 * @param {{ field: string, code: string }[]} [options.errors]
 * @returns {object} the surrogate dam view model
 */
function buildViewModel({ request, values, errors = [] }) {
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
      calfPagePath(cph, registrationId, calfNumber, 'surrogate-dam')
    ),
    values,
    maxFieldLength: MAX_FIELD_LENGTH,
    errorList,
    fieldErrors
  }
}

export const surrogateDamController = {
  handler(request, h) {
    return h.view(
      TEMPLATE,
      buildViewModel({
        request,
        values: formValuesFrom(request.pre.calf.surrogateDam)
      })
    )
  }
}

export const surrogateDamSubmitController = {
  async handler(request, h) {
    const { cph, registrationId, calfNumber } = request.params
    const values = formValuesFrom(request.payload)
    const result = await registrationClient.saveSurrogateDam({
      ...registrationKey(request),
      calfNumber,
      answers: values
    })

    if (!result) {
      return calfNotFound(request, h)
    }

    const { errors } = result

    if (errors.length) {
      return h
        .view(TEMPLATE, buildViewModel({ request, values, errors }))
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
