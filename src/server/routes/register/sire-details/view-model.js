import { formatEarTag } from '@defra/lis-infra-ui-services/nunjucks/filters'

import { backLinkPath, keepReturn } from '../check-return.js'
import { calfPagePath } from '../paths.js'
import { MAX_FIELD_LENGTH } from '../form-limits.js'

/** @import { SireDetailsAnswers } from '#server/journeys/register/sire-details.js' */

const PAGE_TITLE = 'Sire details'
const FIELDS = ['sireEarTagNumber', 'sireName']

/**
 * @param {object} answers
 * @returns {Required<SireDetailsAnswers>} each field's answer, blank when
 *   absent
 */
export function formValuesFrom(answers) {
  return /** @type {any} */ (
    Object.fromEntries(FIELDS.map((field) => [field, answers[field] ?? '']))
  )
}

/**
 * @param {object} options
 * @param {object} options.request
 * @param {string} options.calfEarTagNumber - the calf's saved ear tag number
 * @param {Required<SireDetailsAnswers>} options.values
 * @param {string} options.backPage - the dam page the calf came through
 * @returns {object} the sire details view model
 */
export function buildViewModel({
  request,
  calfEarTagNumber,
  values,
  backPage
}) {
  const { cph, submissionId, animalId } = request.params

  return {
    pageTitle: PAGE_TITLE,
    heading: PAGE_TITLE,
    calfEarTagNumber: formatEarTag(calfEarTagNumber),
    backLinkHref: backLinkPath(
      request,
      calfPagePath(cph, submissionId, animalId, backPage)
    ),
    formAction: keepReturn(
      request,
      calfPagePath(cph, submissionId, animalId, 'sire-details')
    ),
    values,
    maxFieldLength: MAX_FIELD_LENGTH
  }
}
