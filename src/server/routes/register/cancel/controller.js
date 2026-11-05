import Boom from '@hapi/boom'
import { formatEarTag } from '@defra/lis-infra-ui-services/nunjucks/filters'

import { registrationClient } from '#server/services/registration-client.js'
import { calfPagePath, registrationPagePath } from '../paths.js'
import { registrationKey } from '../registration.js'
import { CHECK_PAGE } from '../check-return.js'

const TEMPLATE = 'register/cancel/index'
const PAGE_TITLE = 'Are you sure you want to cancel this registration?'
export const CANCEL_PAGE = 'cancel'
const NEXT_PAGE = 'tag-list'

/**
 * @param {object} request
 * @returns {Promise<object>} the calf in the path
 * @throws {Boom.Boom} a 404 for a calf the registration does not have:
 *   cancelling starts on check calf details, so only a saved calf has one
 */
async function demandCalf(request) {
  const calf = await registrationClient.getCalf({
    ...registrationKey(request),
    calfNumber: request.params.calfNumber
  })

  if (!calf) {
    throw Boom.notFound()
  }

  return calf
}

/**
 * @param {object} request
 * @param {object} calf - the saved calf
 * @returns {object} the cancel registration view model
 */
function buildViewModel(request, calf) {
  const { cph, registrationId, calfNumber } = request.params
  const checkHref = calfPagePath(cph, registrationId, calfNumber, CHECK_PAGE)

  return {
    pageTitle: PAGE_TITLE,
    heading: PAGE_TITLE,
    earTagNumber: formatEarTag(calf.calfDetails.earTagNumber),
    backLinkHref: checkHref,
    keepHref: checkHref,
    formAction: calfPagePath(cph, registrationId, calfNumber, CANCEL_PAGE)
  }
}

export const cancelCalfController = {
  async handler(request, h) {
    return h.view(TEMPLATE, buildViewModel(request, await demandCalf(request)))
  }
}

export const cancelCalfSubmitController = {
  // A calf already removed, or a registration already gone, ends in the
  // same place: the calf is not registered either way.
  async handler(request, h) {
    const { cph, registrationId, calfNumber } = request.params

    await registrationClient.removeCalf({
      ...registrationKey(request),
      calfNumber
    })

    return h.redirect(registrationPagePath(cph, registrationId, NEXT_PAGE))
  }
}
