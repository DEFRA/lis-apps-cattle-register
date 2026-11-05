import { registrationClient } from '#server/services/registration-client.js'
import { calfPagePath } from '../paths.js'
import { calfNotFound, damPage, registrationKey } from '../registration.js'

const TEMPLATE = 'register/sire-details/index'
const PAGE_TITLE = 'Sire details'
const FIELDS = ['sireEarTagNumber', 'sireName']
// Not built yet: the prototype continues with checking the calf's details.
const NEXT_PAGE = 'check-calf-details'

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
    calfEarTagNumber: calf.calfDetails.earTagNumber,
    backLinkHref: calfPagePath(
      cph,
      registrationId,
      calfNumber,
      damPage(calf.damDetails)
    ),
    formAction: calfPagePath(cph, registrationId, calfNumber, 'sire-details'),
    values: formValuesFrom(calf.sireDetails)
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

    return h.redirect(calfPagePath(cph, registrationId, calfNumber, NEXT_PAGE))
  }
}
