import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'
import { formatEarTag } from '@defra/lis-infra-ui-services/nunjucks/filters'

import { registrationClient } from '#server/services/registration-client.js'
import { calfPagePath, registrationPagePath } from '../paths.js'
import { calfNotFound, registrationKey } from '../registration.js'
import { getMessage } from './messages.js'

const TEMPLATE = 'register/dam-details/index'
const PAGE_TITLE = 'Dam details'
const NEXT_PAGE_BY_DAM_TYPE = {
  genetic: 'genetic-dam',
  surrogate: 'surrogate-dam'
}

/**
 * @param {string} damType
 * @returns {string} the step that follows that dam type
 */
function nextPageFor(damType) {
  const nextPage = NEXT_PAGE_BY_DAM_TYPE[damType]

  if (!nextPage) {
    throw new Error(`No page follows dam type "${damType}"`)
  }

  return nextPage
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
    calfEarTagNumber: formatEarTag(request.pre.calf.calfDetails.earTagNumber),
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
    const result = await registrationClient.saveDamDetails({
      ...registrationKey(request),
      calfNumber,
      answers: { damType }
    })

    if (!result) {
      return calfNotFound(request, h)
    }

    const { errors } = result

    if (errors.length) {
      return h
        .view(TEMPLATE, buildViewModel({ request, damType, errors }))
        .code(statusCodes.badRequest)
    }

    return h.redirect(
      calfPagePath(cph, registrationId, calfNumber, nextPageFor(damType))
    )
  }
}
