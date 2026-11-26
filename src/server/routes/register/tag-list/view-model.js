import { formatEarTag } from '@defra/lis-infra-ui-services/nunjucks/filters'

import { CHECK_PAGE } from '../check-return.js'
import { calfPagePath, newCalfPath, submissionPath } from '../paths.js'
import { getMessage } from './messages.js'

const PAGE_TITLE = 'Register new cattle births'

/**
 * @typedef {object} ListedCalf
 * @property {string} animalId
 * @property {string} earTagNumber - as saved
 * @property {boolean} isReady - whether it is ready to send
 */

/**
 * @param {object} options
 * @param {object} options.request
 * @param {ListedCalf[]} options.calves - in the order they were added
 * @param {string} [options.addAnother]
 * @param {{ field: string, code: string }[]} [options.errors]
 * @returns {object} the tag list view model
 */
export function buildViewModel({
  request,
  calves,
  addAnother = '',
  errors = []
}) {
  const { cph, submissionId } = request.params
  const items = calves.map(({ animalId, earTagNumber, isReady }) => ({
    id: `calf-${animalId}`,
    earTagNumber: formatEarTag(earTagNumber),
    // As designed, every calf opens its check calf details, which goes on to
    // the first page left to answer
    href: calfPagePath(cph, submissionId, animalId, CHECK_PAGE),
    isReady
  }))
  const firstNotReady = items.find((item) => !item.isReady)
  // The incomplete error is about a calf, not a field on this page, so it
  // links to the row link of the first calf to complete.
  const hrefOf = ({ field }) =>
    field === 'calves' ? `#${firstNotReady.id}` : `#${field}`

  return {
    pageTitle: errors.length ? `Error: ${PAGE_TITLE}` : PAGE_TITLE,
    heading: PAGE_TITLE,
    // With no calves left, back to where the first is added.
    backLinkHref: items.at(-1)?.href ?? newCalfPath(cph, submissionId),
    formAction: submissionPath(cph, submissionId),
    calves: items,
    values: { addAnother },
    errorList: errors.map((error) => ({
      text: getMessage(error),
      href: hrefOf(error)
    })),
    fieldErrors: Object.fromEntries(
      errors.map((error) => [error.field, { text: getMessage(error) }])
    )
  }
}
