/*
 * The rules for the calf details step. The cattle-register
 * backend-for-frontend stores whatever it is given, so every field rule
 * lives here and runs before anything is saved.
 */
import { breeds } from '@defra/lis-species-cattle'
import { differenceInCalendarDays, isValid, parse } from 'date-fns'
import Joi from 'joi'

import { DATE_FORMAT, toUkDate } from '#server/common/helpers/calendar-date.js'

const REQUIRED = 'required'
const OVER_DEADLINE = 'calf.overDeadline'
const BIRTH_REPORTING_DEADLINE_DAYS = 27
const DATE_PARTS = 3
const YEAR_DIGITS = 4

/**
 * Each cattle breed as an item of the breed autocomplete: it shows
 * "Name (CODE)" and submits the code.
 * @type {{ value: string, text: string }[]}
 */
export const breedOptions = Object.entries(breeds).map(([code, name]) => ({
  value: code,
  text: `${name} (${code})`
}))

/**
 * @returns {Joi.StringSchema} an answer that must be given: a blank one, or
 *   one of only spaces, counts as not given
 */
function answer() {
  return Joi.string()
    .trim()
    .empty(Joi.string().allow('').pattern(/^\s*$/))
    .required()
}

/**
 * @typedef {object} CalfDetailsAnswers
 * @property {string} [earTagNumber]
 * @property {string} [dateOfBirth] - D/M/YYYY
 * @property {string} [sex] - male or female
 * @property {string} [breed] - the breed code
 */

/**
 * Follows the prototype: anything that is not three "/"-separated parts is
 * a missing date. Warns, without failing, about a birth reported after the
 * deadline: provisional, and kept in one place so it can be removed.
 * @param {string} dateOfBirth - not blank
 * @param {object} helpers - Joi's
 * @returns {string | object} the date of birth, or the Joi error
 */
function checkDateOfBirth(dateOfBirth, helpers) {
  const today = toUkDate(new Date())
  const parts = dateOfBirth.split('/')

  if (parts.length !== DATE_PARTS || !parts.every(Boolean)) {
    return helpers.message(REQUIRED)
  }

  const birthDate = parse(dateOfBirth, DATE_FORMAT, today)

  // date-fns reads a shorter year as that year: 26 as the year 26
  if (!isValid(birthDate) || parts.at(-1).length !== YEAR_DIGITS) {
    return helpers.message('invalid')
  }

  const age = differenceInCalendarDays(today, birthDate)

  if (age < 0) {
    return helpers.message('future')
  }

  if (age > BIRTH_REPORTING_DEADLINE_DAYS) {
    helpers.warn(OVER_DEADLINE)
  }

  return dateOfBirth
}

/**
 * A calf's details. Each rule's message is the code of its error, which the
 * page words in its messages.js. Validate it with, as context,
 * `availableEarTags` (the ear tags the calf can be given: the holding's
 * unallocated ones, and the one the calf already has).
 */
export const calfDetailsSchema = Joi.object({
  earTagNumber: answer()
    .valid(Joi.in('$availableEarTags'))
    .messages({ 'any.only': 'notAvailable' }),
  dateOfBirth: answer()
    .custom(checkDateOfBirth)
    .messages({ [OVER_DEADLINE]: 'overDeadline' }),
  sex: answer().valid('male', 'female').messages({ 'any.only': REQUIRED }),
  breed: answer()
    .valid(...Object.keys(breeds))
    .messages({ 'any.only': 'unknown' })
}).messages({ 'any.required': REQUIRED })
