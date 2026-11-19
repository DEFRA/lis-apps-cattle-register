import { getMountPath } from '@defra/lis-hubs-infra-registry'

export const CONFIRMATION_PAGE = 'confirmation'

/**
 * @param {number} calfCount
 * @returns {string} what was registered, a single calf worded as one
 */
function registered(calfCount) {
  return calfCount === 1
    ? '1 calf birth registered'
    : `${calfCount} cattle births registered`
}

/**
 * @param {object} options
 * @param {object} options.request
 * @param {number} options.calfCount - how many calves the registration sent
 * @returns {object} the registration sent view model
 */
export function buildViewModel({ request, calfCount }) {
  const { cph } = request.params
  const title = registered(calfCount)

  return {
    pageTitle: title,
    heading: title,
    homeHref: getMountPath('cattle-home', 'holding', { cph })
  }
}
