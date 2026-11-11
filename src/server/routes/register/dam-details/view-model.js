import { formatEarTag } from '@defra/lis-infra-ui-services/nunjucks/filters'

import { backLinkPath, keepReturn } from '../check-return.js'
import { calfPagePath } from '../paths.js'
import { getMessage } from './messages.js'

const PAGE_TITLE = 'Dam details'

/**
 * @param {object} options
 * @param {object} options.request
 * @param {string} options.calfEarTagNumber - the calf's saved ear tag number
 * @param {string} options.damType
 * @param {{ field: string, code: string }[]} [options.errors]
 * @returns {object} the dam details view model
 */
export function buildViewModel({
  request,
  calfEarTagNumber,
  damType,
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
      calfPagePath(cph, submissionId, animalId, 'calf-details')
    ),
    formAction: keepReturn(
      request,
      calfPagePath(cph, submissionId, animalId, 'dam-details')
    ),
    values: { damType },
    errorList,
    fieldErrors
  }
}
