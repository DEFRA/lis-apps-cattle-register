/*
 * What is asked of the cow that calved, beyond being one of the holding's
 * possible dams: that she was old enough to calve and not too old, and had
 * not calved too recently. Each is judged as at the calf's date of birth.
 */
import {
  addMonths,
  addYears,
  differenceInCalendarDays,
  isValid,
  parse
} from 'date-fns'

import {
  DATE_FORMAT,
  ISO_DATE_FORMAT
} from '#server/common/helpers/calendar-date.js'
import { plainEarTag } from '#server/common/helpers/ear-tag.js'

/** @import { CustomHelpers, ErrorReport } from 'joi' */
/** @import { Dam } from '#server/services/be4fe/data.js' */

const YOUNGEST_MONTHS = 15
const OLDEST_YEARS = 20
const CALVING_GAP_DAYS = 240

const NOT_ON_HOLDING = 'notOnHolding'
const UNDER_15_MONTHS = 'under15Months'
const OVER_20_YEARS = 'over20Years'
const CALVED_IN_240_DAYS = 'calvedIn240Days'
const TWO_CALVES_IN_240_DAYS = 'twoCalvesIn240Days'

// Each rule's message is the code of its error, which the page words
export const DAM_MESSAGES = {
  'any.only': NOT_ON_HOLDING,
  'dam.under15Months': UNDER_15_MONTHS,
  'dam.over20Years': OVER_20_YEARS,
  'dam.calvedIn240Days': CALVED_IN_240_DAYS,
  'dam.twoCalvesIn240Days': TWO_CALVES_IN_240_DAYS
}

/**
 * @param {string | null | undefined} value
 * @param {string} form - the form the date is in
 * @returns {Date | undefined} the date; undefined for a value that is not one
 */
function dateFrom(value, form) {
  const date = parse(value ?? '', form, new Date())

  return isValid(date) ? date : undefined
}

/**
 * @param {Dam} dam
 * @param {Date} calved - the calf's date of birth
 * @returns {number} how many calves she had in the 240 days before it. A
 *   calf born the same day is of the same calving, so is not counted; nor
 *   is one with no date of birth.
 */
function earlierCalves(dam, calved) {
  return dam.calfDatesOfBirth
    .map((dateOfBirth) => dateFrom(dateOfBirth, ISO_DATE_FORMAT))
    .filter((born) => born !== undefined)
    .map((born) => differenceInCalendarDays(calved, born))
    .filter((days) => days > 0 && days <= CALVING_GAP_DAYS).length
}

/**
 * @param {Dam} dam
 * @param {string} [calfDateOfBirth] - as the pages take a date
 * @returns {string | undefined} the code of what rules her out as the cow
 *   that calved; undefined for a dam nothing does, which is any dam while
 *   the calf has no date of birth
 */
export function damProblem(dam, calfDateOfBirth) {
  const calved = dateFrom(calfDateOfBirth, DATE_FORMAT)

  if (calved === undefined) {
    return undefined
  }

  const born = dateFrom(dam.dateOfBirth, ISO_DATE_FORMAT)

  if (born !== undefined && addMonths(born, YOUNGEST_MONTHS) > calved) {
    return UNDER_15_MONTHS
  }

  if (born !== undefined && addYears(born, OLDEST_YEARS) < calved) {
    return OVER_20_YEARS
  }

  const calves = earlierCalves(dam, calved)

  if (calves > 1) {
    return TWO_CALVES_IN_240_DAYS
  }

  return calves === 1 ? CALVED_IN_240_DAYS : undefined
}

/**
 * A Joi rule for the ear tag number of the cow that calved. Validate with,
 * as context, `dam` (the holding's animal of that ear tag number, as the
 * BE4FE finds it: not a male; undefined when it finds none) and
 * `calfDateOfBirth`. An animal found, that is not a male, is one of the
 * holding's dams.
 * @param {string} value
 * @param {CustomHelpers} helpers
 * @returns {string | ErrorReport} the value, for one of the holding's dams
 *   that nothing rules out; notOnHolding when no dam is found, or the one
 *   found is not of this ear tag number
 */
export function damThatCalved(value, helpers) {
  const { dam, calfDateOfBirth } = helpers.prefs.context
  const earTagNumber = plainEarTag(value)

  if (dam === undefined || dam.earTagNumber !== earTagNumber) {
    return helpers.error('any.only')
  }

  const problem = damProblem(dam, calfDateOfBirth)

  return problem ? helpers.error(`dam.${problem}`) : value
}
