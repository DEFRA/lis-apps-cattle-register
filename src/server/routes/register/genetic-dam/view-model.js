import { formatEarTag } from '@defra/lis-infra-ui-services/nunjucks/filters'

import { backLinkPath, keepReturn } from '../check-return.js'
import { calfPagePath } from '../paths.js'
import { MAX_FIELD_LENGTH } from '../form-limits.js'
import { getMessage } from './messages.js'

const PAGE_TITLE = 'Genetic dam details'

/**
 * @param {object} options
 * @param {object} options.request
 * @param {string} options.calfEarTagNumber - the calf's saved ear tag number
 * @param {string} options.geneticDamEarTagNumber - the genetic dam's
 * @param {string[]} options.earTagItems - the holding's possible dams
 * @param {{ field: string, code: string }[]} [options.errors]
 * @returns {object} the genetic dam view model
 */
export function buildViewModel({
  request,
  calfEarTagNumber,
  geneticDamEarTagNumber,
  earTagItems,
  errors = []
}) {
  const { cph, submissionId, animalId } = request.params
  const errorList = errors.map((error) => ({
    text: getMessage(error),
    href: `#${error.field}`
  }))
  const fieldErrors = Object.fromEntries(
    errors.map((error) => [error.field, { text: getMessage(error) }])
  )

  return {
    pageTitle: errors.length ? `Error: ${PAGE_TITLE}` : PAGE_TITLE,
    heading: PAGE_TITLE,
    calfEarTagNumber: formatEarTag(calfEarTagNumber),
    backLinkHref: backLinkPath(
      request,
      calfPagePath(cph, submissionId, animalId, 'dam-details')
    ),
    formAction: keepReturn(
      request,
      calfPagePath(cph, submissionId, animalId, 'genetic-dam')
    ),
    values: { geneticDamEarTagNumber },
    earTagItems,
    maxFieldLength: MAX_FIELD_LENGTH,
    errorList,
    fieldErrors
  }
}
