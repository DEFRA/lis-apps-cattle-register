import { formatEarTag } from '@defra/lis-infra-ui-services/nunjucks/filters'
import { format, parse } from 'date-fns'

import { DATE_FORMAT } from '#server/common/helpers/calendar-date.js'
import { CHECK_PAGE, withReturnToCheck } from '../check-return.js'
import { calfPagePath } from '../paths.js'
import { breedOptions } from '../validation/calf-details.js'

const PAGE_TITLE = 'Check calf details'
const NOT_PROVIDED = 'Not provided'
const SHOWN_DATE_FORMAT = 'd MMMM yyyy'
const SEX_TEXT = { male: 'Male', female: 'Female' }
const DAM_TYPE_TEXT = { genetic: 'Genetic', surrogate: 'Surrogate' }

/**
 * @param {string} dateOfBirth - D/M/YYYY, as saved
 * @returns {string} e.g. "1 November 2026"
 */
function formatDateOfBirth(dateOfBirth) {
  return format(parse(dateOfBirth, DATE_FORMAT, new Date()), SHOWN_DATE_FORMAT)
}

/**
 * @param {string} code - the breed code, as saved
 * @returns {string} the breed as its autocomplete shows it
 */
function breedText(code) {
  return breedOptions.find(({ value }) => value === code)?.text ?? code
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
 * @param {Record<string, string>} animal - the saved calf
 * @param {(page: string) => string} changeHref
 * @returns {object[]} the rows about the dam, for the dam type answered
 */
function damRows(animal, changeHref) {
  if (animal.damType === 'surrogate') {
    const href = changeHref('surrogate-dam')

    return [
      row(
        'Genetic dam ear tag number',
        formatEarTag(animal.geneticDamEarTagNumber),
        { href, visuallyHiddenText: 'genetic dam ear tag number' }
      ),
      row(
        'Surrogate dam ear tag number',
        formatEarTag(animal.surrogateDamEarTagNumber),
        { href, visuallyHiddenText: 'surrogate dam ear tag number' }
      )
    ]
  }

  return [
    row(
      'Genetic dam ear tag number',
      formatEarTag(animal.geneticDamEarTagNumber),
      {
        href: changeHref('genetic-dam'),
        visuallyHiddenText: 'genetic dam ear tag number'
      }
    )
  ]
}

/**
 * @param {Record<string, string>} animal - the saved calf
 * @param {(page: string) => string} changeHref
 * @returns {object[]} every row of the summary list, in the prototype's order
 */
function summaryRows(animal, changeHref) {
  const calfDetailsHref = changeHref('calf-details')
  const sireDetailsHref = changeHref('sire-details')

  return [
    row('Animal ear tag number', formatEarTag(animal.earTagNumber), {
      href: calfDetailsHref,
      visuallyHiddenText: 'ear tag number'
    }),
    row('Date of birth', formatDateOfBirth(animal.dateOfBirth), {
      href: calfDetailsHref,
      visuallyHiddenText: 'date of birth'
    }),
    row('Sex', SEX_TEXT[animal.sex], {
      href: calfDetailsHref,
      visuallyHiddenText: 'sex'
    }),
    row('Breed', breedText(animal.breed), {
      href: calfDetailsHref,
      visuallyHiddenText: 'breed'
    }),
    row('Dam type', DAM_TYPE_TEXT[animal.damType], {
      href: changeHref('dam-details'),
      visuallyHiddenText: 'dam type'
    }),
    ...damRows(animal, changeHref),
    row(
      'Sire ear tag number',
      formatEarTag(animal.sireEarTagNumber) || NOT_PROVIDED,
      { href: sireDetailsHref, visuallyHiddenText: 'sire ear tag number' }
    ),
    row('Sire name', animal.sireName || NOT_PROVIDED, {
      href: sireDetailsHref,
      visuallyHiddenText: 'sire name'
    })
  ]
}

/**
 * @param {object} options
 * @param {object} options.request
 * @param {Record<string, string>} options.animal - the saved calf, with
 *   every page answered
 * @returns {object} the check calf details view model
 */
export function buildViewModel({ request, animal }) {
  const { cph, submissionId, animalId } = request.params
  const changeHref = (page) =>
    withReturnToCheck(calfPagePath(cph, submissionId, animalId, page))

  return {
    pageTitle: PAGE_TITLE,
    heading: PAGE_TITLE,
    calfEarTagNumber: formatEarTag(animal.earTagNumber),
    backLinkHref: calfPagePath(cph, submissionId, animalId, 'sire-details'),
    formAction: calfPagePath(cph, submissionId, animalId, CHECK_PAGE),
    cancelHref: calfPagePath(cph, submissionId, animalId, 'cancel'),
    rows: summaryRows(animal, changeHref)
  }
}
