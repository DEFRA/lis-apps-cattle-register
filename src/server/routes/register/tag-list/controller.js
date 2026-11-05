import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'
import { formatEarTag } from '@defra/lis-infra-ui-services/nunjucks/filters'

import { calfPagePath, registrationPagePath } from '../paths.js'
import { firstIncompletePage } from '../registration.js'
import { formErrors } from '../form-errors.js'
import { CHECK_PAGE } from '../check-return.js'
import { getMessage } from './messages.js'

const TEMPLATE = 'register/tag-list/index'
const PAGE_TITLE = 'Register new cattle births'
const TAG_LIST_PAGE = 'tag-list'
// Not built yet: the prototype continues, once every calf is ready, with
// the page that sends the registration.
const SUBMIT_PAGE = 'submit'

/**
 * @param {object} calf - a saved calf
 * @returns {string} where its row links to: check calf details once
 *   confirmed, otherwise the first page it has not completed
 */
function calfPage(calf) {
  return calf.checked ? CHECK_PAGE : (firstIncompletePage(calf) ?? CHECK_PAGE)
}

/**
 * @param {object} request - with the registration in request.pre.registration
 * @returns {{ id: string, earTagNumber: string, href: string, isReady: boolean }[]}
 *   one item per calf, in the order they were added; id is its row link's
 */
function calfItems(request) {
  const { cph, registrationId } = request.params

  return request.pre.registration.calves.map((calf, index) => ({
    id: `calf-${index + 1}`,
    earTagNumber: formatEarTag(calf.calfDetails.earTagNumber),
    href: calfPagePath(cph, registrationId, index + 1, calfPage(calf)),
    isReady: calf.checked
  }))
}

/**
 * @param {object} options
 * @param {object} options.request - with the registration in request.pre.registration
 * @param {string} [options.addAnother]
 * @param {{ field: string, code: string }[]} [options.errors]
 * @returns {object} the tag list view model
 */
function buildViewModel({ request, addAnother = '', errors = [] }) {
  const { cph, registrationId } = request.params
  const calves = calfItems(request)
  const { errorList, fieldErrors } = formErrors(errors, getMessage)
  const firstNotReady = calves.find((calf) => !calf.isReady)

  return {
    pageTitle: errors.length ? `Error: ${PAGE_TITLE}` : PAGE_TITLE,
    heading: PAGE_TITLE,
    backLinkHref: calves.at(-1).href,
    formAction: registrationPagePath(cph, registrationId, TAG_LIST_PAGE),
    calves,
    values: { addAnother },
    // The incomplete error is about a calf, not a field on this page, so it
    // links to the row link of the first calf to complete.
    errorList: errorList.map((item) =>
      item.href === '#calves' ? { ...item, href: `#${firstNotReady.id}` } : item
    ),
    fieldErrors
  }
}

/**
 * @param {string} addAnother - the answer to "Add more animals"
 * @param {{ calves: object[], canAddCalf: boolean }} registration
 * @returns {{ field: string, code: string }[]}
 */
function validate(addAnother, { calves, canAddCalf }) {
  if (addAnother === 'yes') {
    return canAddCalf ? [] : [{ field: 'addAnother', code: 'tooMany' }]
  }

  if (addAnother === 'no') {
    return calves.every((calf) => calf.checked)
      ? []
      : [{ field: 'calves', code: 'incomplete' }]
  }

  return [{ field: 'addAnother', code: 'required' }]
}

export const tagListController = {
  handler(request, h) {
    return h.view(TEMPLATE, buildViewModel({ request }))
  }
}

export const tagListSubmitController = {
  handler(request, h) {
    const { cph, registrationId } = request.params
    const { addAnother } = request.payload
    const { registration } = request.pre
    const errors = validate(addAnother, registration)

    if (errors.length) {
      return h
        .view(TEMPLATE, buildViewModel({ request, addAnother, errors }))
        .code(statusCodes.badRequest)
    }

    if (addAnother === 'yes') {
      return h.redirect(
        calfPagePath(
          cph,
          registrationId,
          registration.calves.length + 1,
          'calf-details'
        )
      )
    }

    return h.redirect(registrationPagePath(cph, registrationId, SUBMIT_PAGE))
  }
}
