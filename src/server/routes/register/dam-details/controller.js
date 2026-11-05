import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'

import { registrationClient } from '#server/services/registration-client.js'
import { calfPagePath, registrationPagePath } from '../paths.js'
import { registrationKey } from '../registration.js'
import { getMessage } from './messages.js'

const TEMPLATE = 'register/dam-details/index'
const PAGE_TITLE = 'Dam details'
const NEXT_PAGE_BY_DAM_TYPE = {
  genetic: 'genetic-dam',
  surrogate: 'surrogate-dam'
}

/**
 * @param {object} options
 * @param {object} options.request - with the saved calf in request.pre.calf
 * @param {string} options.damType
 * @param {{ field: string, code: string }[]} [options.errors]
 * @returns {object} the dam details view model
 */
function buildViewModel({ request, damType, errors = [] }) {
  const { cph, registrationId, calfNumber } = request.params
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
    calfEarTagNumber: request.pre.calf.calfDetails.earTagNumber,
    backLinkHref: registrationPagePath(cph, registrationId, 'calf-details'),
    formAction: calfPagePath(cph, registrationId, calfNumber, 'dam-details'),
    values: { damType },
    errorList,
    fieldErrors
  }
}

export const damDetailsController = {
  handler(request, h) {
    return h.view(
      TEMPLATE,
      buildViewModel({
        request,
        damType: request.pre.calf.damDetails.damType ?? ''
      })
    )
  }
}

export const damDetailsSubmitController = {
  async handler(request, h) {
    const { cph, registrationId, calfNumber } = request.params
    const { damType } = request.payload
    const { errors } = await registrationClient.saveDamDetails({
      ...registrationKey(request),
      calfNumber,
      answers: { damType }
    })

    if (errors.length) {
      return h
        .view(TEMPLATE, buildViewModel({ request, damType, errors }))
        .code(statusCodes.badRequest)
    }

    return h.redirect(
      calfPagePath(
        cph,
        registrationId,
        calfNumber,
        NEXT_PAGE_BY_DAM_TYPE[damType]
      )
    )
  }
}
