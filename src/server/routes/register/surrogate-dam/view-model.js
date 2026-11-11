import { formatEarTag } from '@defra/lis-infra-ui-services/nunjucks/filters'

import { calfPagePath } from '../paths.js'
import { MAX_FIELD_LENGTH } from '../form-limits.js'
import { getMessage } from './messages.js'

const PAGE_TITLE = 'Genetic and surrogate dam details'

/**
 * @param {object} options
 * @param {object} options.request
 * @param {string} options.calfEarTagNumber - the calf's saved ear tag number
 * @param {{ geneticDamEarTagNumber: string, surrogateDamEarTagNumber: string }} options.values
 * @param {string[]} options.earTagItems - the holding's possible dams
 * @param {{ field: string, code: string }[]} [options.errors]
 * @returns {object} the genetic and surrogate dam view model
 */
export function buildViewModel({
  request,
  calfEarTagNumber,
  values,
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
    backLinkHref: calfPagePath(cph, submissionId, animalId, 'dam-details'),
    formAction: calfPagePath(cph, submissionId, animalId, 'surrogate-dam'),
    values,
    earTagItems,
    maxFieldLength: MAX_FIELD_LENGTH,
    errorList,
    fieldErrors
  }
}
