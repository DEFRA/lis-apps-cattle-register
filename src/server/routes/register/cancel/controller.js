import { formatEarTag } from '@defra/lis-infra-ui-services/nunjucks/filters'

import { registrationClient } from '#server/services/registration-client.js'
import { calfPagePath, registrationPagePath } from '../paths.js'
import { registrationKey, storedEarTagNumber } from '../registration.js'
import { CHECK_PAGE } from '../check-return.js'

const TEMPLATE = 'register/cancel/index'
const PAGE_TITLE = 'Are you sure you want to cancel this registration?'
export const CANCEL_PAGE = 'cancel'
const NEXT_PAGE = 'tag-list'

/**
 * @param {object} request - with the saved calf in request.pre.calf
 * @returns {object} the cancel registration view model
 */
function buildViewModel(request) {
  const { calf } = request.pre
  const { cph, registrationId, calfNumber } = request.params
  const checkHref = calfPagePath(cph, registrationId, calfNumber, CHECK_PAGE)

  return {
    pageTitle: PAGE_TITLE,
    heading: PAGE_TITLE,
    calfEarTagNumber: formatEarTag(calf.calfDetails.earTagNumber),
    storedCalfEarTagNumber: storedEarTagNumber(calf),
    backLinkHref: checkHref,
    keepHref: checkHref,
    formAction: calfPagePath(cph, registrationId, calfNumber, CANCEL_PAGE)
  }
}

export const cancelCalfController = {
  handler(request, h) {
    return h.view(TEMPLATE, buildViewModel(request))
  }
}

export const cancelCalfSubmitController = {
  // A calf already removed, or a registration already gone, ends in the
  // same place, before this, in demandSameCalf(): the calf is not
  // registered either way.
  async handler(request, h) {
    const { cph, registrationId, calfNumber } = request.params

    await registrationClient.removeCalf({
      ...registrationKey(request),
      calfNumber
    })

    return h.redirect(registrationPagePath(cph, registrationId, NEXT_PAGE))
  }
}
