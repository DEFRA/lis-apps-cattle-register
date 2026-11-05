import {
  formatDate,
  formatEarTag
} from '@defra/lis-infra-ui-services/nunjucks/filters'

import { registrationClient } from '#server/services/registration-client.js'
import { calfPagePath, registrationPagePath } from '../paths.js'
import {
  calfNotFound,
  registrationKey,
  storedEarTagNumber
} from '../registration.js'
import { CHECK_PAGE, withReturnToCheck } from '../check-return.js'
import { CANCEL_PAGE } from '../cancel/controller.js'

const TEMPLATE = 'register/check-calf-details/index'
const PAGE_TITLE = 'Check calf details'
const NOT_PROVIDED = 'Not provided'
const NEXT_PAGE = 'tag-list'
const SEX_TEXT = { male: 'Male', female: 'Female' }
const DAM_TYPE_TEXT = { genetic: 'Genetic', surrogate: 'Surrogate' }

/**
 * @param {string} dateOfBirth - D/M/YYYY, as saved
 * @returns {string} e.g. "1 November 2026"
 */
function formatDateOfBirth(dateOfBirth) {
  const [day, month, year] = dateOfBirth.trim().split('/').map(Number)

  return formatDate(new Date(year, month - 1, day), 'd MMMM yyyy')
}

/**
 * @param {string} key
 * @param {string} value
 * @param {{ href: string, visuallyHiddenText: string }} change
 * @returns {object} a summary list row with a Change link
 */
function row(key, value, { href, visuallyHiddenText }) {
  return {
    key: { text: key },
    value: { text: value },
    actions: {
      items: [{ href, text: 'Change', visuallyHiddenText }]
    }
  }
}

/**
 * @param {object} calf - the saved calf
 * @param {(page: string) => string} changeHref
 * @returns {object[]} the rows about the dam, for the dam type answered
 */
function damRows(calf, changeHref) {
  const { damDetails, geneticDam, surrogateDam } = calf

  if (damDetails.damType === 'surrogate') {
    const href = changeHref('surrogate-dam')

    return [
      row(
        'Genetic dam ear tag number',
        formatEarTag(surrogateDam.geneticDamEarTagNumber),
        { href, visuallyHiddenText: 'genetic dam ear tag number' }
      ),
      row(
        'Surrogate dam ear tag number',
        formatEarTag(surrogateDam.surrogateDamEarTagNumber),
        { href, visuallyHiddenText: 'surrogate dam ear tag number' }
      )
    ]
  }

  return [
    row('Genetic dam ear tag number', formatEarTag(geneticDam.earTagNumber), {
      href: changeHref('genetic-dam'),
      visuallyHiddenText: 'genetic dam ear tag number'
    })
  ]
}

/**
 * @param {object} calf - the saved calf
 * @param {(page: string) => string} changeHref
 * @returns {object[]} every row of the summary list, in the prototype's order
 */
function summaryRows(calf, changeHref) {
  const { calfDetails, damDetails, sireDetails } = calf
  const calfDetailsHref = changeHref('calf-details')
  const sireDetailsHref = changeHref('sire-details')

  return [
    row('Animal ear tag number', formatEarTag(calfDetails.earTagNumber), {
      href: calfDetailsHref,
      visuallyHiddenText: 'ear tag number'
    }),
    row('Date of birth', formatDateOfBirth(calfDetails.dateOfBirth), {
      href: calfDetailsHref,
      visuallyHiddenText: 'date of birth'
    }),
    row('Sex', SEX_TEXT[calfDetails.sex], {
      href: calfDetailsHref,
      visuallyHiddenText: 'sex'
    }),
    row('Breed', calfDetails.breed, {
      href: calfDetailsHref,
      visuallyHiddenText: 'breed'
    }),
    row('Dam type', DAM_TYPE_TEXT[damDetails.damType], {
      href: changeHref('dam-details'),
      visuallyHiddenText: 'dam type'
    }),
    ...damRows(calf, changeHref),
    row(
      'Sire ear tag number',
      formatEarTag(sireDetails.sireEarTagNumber) || NOT_PROVIDED,
      { href: sireDetailsHref, visuallyHiddenText: 'sire ear tag number' }
    ),
    row('Sire name', sireDetails.sireName || NOT_PROVIDED, {
      href: sireDetailsHref,
      visuallyHiddenText: 'sire name'
    })
  ]
}

/**
 * @param {object} request - with the saved calf in request.pre.calf
 * @returns {object} the check calf details view model
 */
function buildViewModel(request) {
  const { cph, registrationId, calfNumber } = request.params
  const changeHref = (page) =>
    withReturnToCheck(calfPagePath(cph, registrationId, calfNumber, page))

  return {
    pageTitle: PAGE_TITLE,
    heading: PAGE_TITLE,
    calfEarTagNumber: formatEarTag(request.pre.calf.calfDetails.earTagNumber),
    storedCalfEarTagNumber: storedEarTagNumber(request.pre.calf),
    backLinkHref: calfPagePath(cph, registrationId, calfNumber, 'sire-details'),
    formAction: calfPagePath(cph, registrationId, calfNumber, CHECK_PAGE),
    cancelHref: calfPagePath(cph, registrationId, calfNumber, CANCEL_PAGE),
    rows: summaryRows(request.pre.calf, changeHref)
  }
}

export const checkCalfDetailsController = {
  handler(request, h) {
    return h.view(TEMPLATE, buildViewModel(request))
  }
}

export const checkCalfDetailsSubmitController = {
  async handler(request, h) {
    const { cph, registrationId, calfNumber } = request.params
    const result = await registrationClient.confirmCalf({
      ...registrationKey(request),
      calfNumber
    })

    if (!result) {
      return calfNotFound(request, h)
    }

    return h.redirect(registrationPagePath(cph, registrationId, NEXT_PAGE))
  }
}
