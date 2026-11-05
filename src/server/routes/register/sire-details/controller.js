import { formatEarTag } from '@defra/lis-infra-ui-services/nunjucks/filters'

import { registrationClient } from '#server/services/registration-client.js'
import { calfPagePath } from '../paths.js'
import { MAX_FIELD_LENGTH } from '../form-limits.js'
import { calfNotFound, damPage, registrationKey } from '../registration.js'
import { backLinkPath, CHECK_PAGE, keepReturn } from '../check-return.js'

const TEMPLATE = 'register/sire-details/index'
const PAGE_TITLE = 'Sire details'
const FIELDS = ['sireEarTagNumber', 'sireName']

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
 * @param {object} request - with the saved calf in request.pre.calf
 * @returns {object} the sire details view model
 */
function buildViewModel(request) {
  const { cph, registrationId, calfNumber } = request.params
  const { calf } = request.pre

  return {
    pageTitle: PAGE_TITLE,
    heading: PAGE_TITLE,
    calfEarTagNumber: formatEarTag(calf.calfDetails.earTagNumber),
    backLinkHref: backLinkPath(
      request,
      calfNumber,
      calfPagePath(cph, registrationId, calfNumber, damPage(calf.damDetails))
    ),
    formAction: keepReturn(
      request,
      calfPagePath(cph, registrationId, calfNumber, 'sire-details')
    ),
    values: formValuesFrom(calf.sireDetails),
    maxFieldLength: MAX_FIELD_LENGTH
  }
}

export const sireDetailsController = {
  handler(request, h) {
    return h.view(TEMPLATE, buildViewModel(request))
  }
}

export const sireDetailsSubmitController = {
  async handler(request, h) {
    const { cph, registrationId, calfNumber } = request.params
    const result = await registrationClient.saveSireDetails({
      ...registrationKey(request),
      calfNumber,
      answers: formValuesFrom(request.payload)
    })

    if (!result) {
      return calfNotFound(request, h)
    }

    return h.redirect(calfPagePath(cph, registrationId, calfNumber, CHECK_PAGE))
  }
}
