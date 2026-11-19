import { submissionPagePath, submissionPath } from '../paths.js'

const PAGE_TITLE = 'Now send your cattle birth registration'
export const SUBMIT_PAGE = 'submit'

/**
 * @param {object} options
 * @param {object} options.request
 * @returns {object} the send registration view model
 */
export function buildViewModel({ request }) {
  const { cph, submissionId } = request.params

  return {
    pageTitle: PAGE_TITLE,
    heading: PAGE_TITLE,
    backLinkHref: submissionPath(cph, submissionId),
    formAction: submissionPagePath(cph, submissionId, SUBMIT_PAGE)
  }
}
