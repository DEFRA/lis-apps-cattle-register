import { formatEarTag } from '@defra/lis-infra-ui-services/nunjucks/filters'

import { CHECK_PAGE } from '../check-return.js'
import { calfPagePath } from '../paths.js'

const PAGE_TITLE = 'Are you sure you want to cancel this registration?'
export const CANCEL_PAGE = 'cancel'

/**
 * @param {object} options
 * @param {object} options.request
 * @param {Record<string, string>} options.animal - the saved calf
 * @returns {object} the cancel registration view model
 */
export function buildViewModel({ request, animal }) {
  const { cph, submissionId, animalId } = request.params
  const checkHref = calfPagePath(cph, submissionId, animalId, CHECK_PAGE)

  return {
    pageTitle: PAGE_TITLE,
    heading: PAGE_TITLE,
    calfEarTagNumber: formatEarTag(animal.earTagNumber),
    backLinkHref: checkHref,
    keepHref: checkHref,
    formAction: calfPagePath(cph, submissionId, animalId, CANCEL_PAGE)
  }
}
