/*
 * The rules for the calf details step. The cattle-register
 * backend-for-frontend stores whatever it is given, so every field rule
 * lives here and runs before anything is saved.
 */
import { breeds } from '@defra/lis-species-cattle'
import { differenceInCalendarDays, isValid, parse } from 'date-fns'
import Joi from 'joi'

import { DATE_FORMAT, toUkDate } from '#server/common/helpers/calendar-date.js'
import { plainEarTag } from '#server/common/helpers/ear-tag.js'
import {
  answer,
  earTagNumber,
  isTooLongEarTagNumber,
  REQUIRED,
  TOO_LONG
} from './answer.js'

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

// The longest a breed may be as typed: longer than any breed's name and code
const MAX_BREED_LENGTH = 50

/**
 * @param {string} breed - a breed's code, name, or both, as typed
 * @returns {string} what it is matched by: any case and spacing, any
 *   apostrophe, and an "X" that ends the name for "Cross"
 */
function breedKey(breed) {
  return breed
    .toLowerCase()
    .replaceAll(/[‘’]/g, "'")
    .replace('(', ' (')
    .replaceAll(/\s+/g, ' ')
    .trim()
    .replace(/ x(?= \(|$)/, ' cross')
}

// Each breed's code by what may be typed for it: its code, its name, or
// both as the breed list shows them
const breedCodes = new Map(
  Object.entries(breeds).flatMap(([code, name]) => [
    [breedKey(code), code],
    [breedKey(name), code],
    [breedKey(`${name} (${code})`), code]
  ])
)

/**
 * @param {string} typed - a breed as typed
 * @returns {string | undefined} the code of the breed it names; undefined
 *   when it names none
 */
export function breedCode(typed) {
  return breedCodes.get(breedKey(typed))
}

/**
 * @param {string} breed - a breed's code, as it is saved, or what was typed
 * @returns {string} the breed as the breed list shows it; what was given
 *   when that is not a breed's code
 */
export function breedText(breed) {
  return breedOptions.find(({ value }) => value === breed)?.text ?? breed
}

/**
 * @template {{ earTagNumber: string, breed: string }} T
 * @param {T} answers - the calf details as typed
 * @returns {T} the answers as they are held: the ear tag number in capitals
 *   with no spaces, and the breed as its code, however each was typed. An
 *   ear tag number that is too long, and a breed that names none, are left
 *   as typed.
 */
export function asHeld(answers) {
  const { earTagNumber: typedEarTag, breed } = answers

  return {
    ...answers,
    earTagNumber: isTooLongEarTagNumber(typedEarTag)
      ? typedEarTag
      : plainEarTag(typedEarTag),
    breed: breedCode(breed) ?? breed
  }
}

/**
 * A Joi rule for the breed: one too long is refused for its length alone,
 * and any other must be a breed's code.
 * @param {string} value
 * @param {Joi.CustomHelpers} helpers
 * @returns {string | Joi.ErrorReport} the value, for a breed's code
 */
function knownBreed(value, helpers) {
  // Not counting the spaces it is typed with beyond one between words
  if (value.replaceAll(/\s+/g, ' ').length > MAX_BREED_LENGTH) {
    return helpers.message(TOO_LONG)
  }

  return Object.hasOwn(breeds, value) ? value : helpers.message('unknown')
}

/**
 * @typedef {object} CalfDetailsAnswers
 * @property {string} [earTagNumber]
 * @property {string} [dateOfBirth] - D/M/YYYY
 * @property {string} [sex] - male or female
 * @property {string} [breed] - the breed code
 */

/**
 * Anything that is not a day, a month and a four digit year is not a real
 * date. Warns, without failing, about a birth reported after the
 * deadline: provisional, and kept in one place so it can be removed.
 * @param {string} dateOfBirth - not blank
 * @param {object} helpers - Joi's
 * @returns {string | object} the date of birth, or the Joi error
 */
function checkDateOfBirth(dateOfBirth, helpers) {
  const today = toUkDate(new Date())
  const parts = dateOfBirth.split('/')
  const birthDate = parse(dateOfBirth, DATE_FORMAT, today)

  // date-fns reads a shorter year as that year: 26 as the year 26
  if (
    parts.length !== DATE_PARTS ||
    parts.at(-1).length !== YEAR_DIGITS ||
    !isValid(birthDate)
  ) {
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
 * A Joi rule for the calf's ear tag number: one of those it can be given.
 * @param {string} value
 * @param {Joi.CustomHelpers} helpers
 * @returns {string | Joi.ErrorReport} the value, for an available ear tag
 */
function availableEarTag(value, helpers) {
  return helpers.prefs.context.availableEarTags.includes(value)
    ? value
    : helpers.message('notAvailable')
}

/**
 * A calf's details. Each rule's message is the code of its error, which the
 * page words in its messages.js. Validate it with, as context,
 * `availableEarTags` (the ear tags the calf can be given: the holding's
 * unallocated ones, and the one the calf already has).
 */
export const calfDetailsSchema = Joi.object({
  earTagNumber: earTagNumber(availableEarTag),
  dateOfBirth: answer()
    .custom(checkDateOfBirth)
    .messages({ [OVER_DEADLINE]: 'overDeadline' }),
  sex: answer().valid('male', 'female').messages({ 'any.only': REQUIRED }),
  breed: answer().custom(knownBreed)
}).messages({ 'any.required': REQUIRED })
