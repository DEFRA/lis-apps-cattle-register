/*
 * TEMPORARY STUB until the cattle-register backend-for-frontend lands under
 * LREG-876. The spoke is stateless: draft answers and validation belong to
 * that service, so nothing here is persisted and the rules below move there.
 * Keep the interface (getCalfDetails/saveCalfDetails, field + code results)
 * when replacing it with the real client.
 */
/** @import { CalendarDate } from '#server/common/helpers/calendar-date.js' */
import { breedOptions } from '#server/common/helpers/breed-options.js'
import {
  daysBetween,
  toUkCalendarDate
} from '#server/common/helpers/calendar-date.js'

const SEXES = new Set(['male', 'female'])
const BIRTH_REPORTING_DEADLINE_DAYS = 27
const DATE_PARTS = 3
const DAY_OR_MONTH_PATTERN = /^\d{1,2}$/
const YEAR_PATTERN = /^\d{4}$/

const knownBreeds = new Set(breedOptions)

/**
 * @typedef {object} CalfDetailsAnswers
 * @property {string} [earTagNumber]
 * @property {string} [dateOfBirth] - D/M/YYYY
 * @property {string} [sex] - male or female
 * @property {string} [breed] - "Name (CODE)"
 */

/**
 * @typedef {object} FieldResult
 * @property {'earTagNumber'|'dateOfBirth'|'sex'|'breed'} field
 * @property {string} code
 */

/**
 * @param {string[]} parts - day, month and year text
 * @returns {CalendarDate | null}
 */
function toRealDate([dayText, monthText, yearText]) {
  if (
    !DAY_OR_MONTH_PATTERN.test(dayText) ||
    !DAY_OR_MONTH_PATTERN.test(monthText) ||
    !YEAR_PATTERN.test(yearText)
  ) {
    return null
  }

  const [day, month, year] = [dayText, monthText, yearText].map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return { day, month, year }
}

/**
 * Follows the prototype: anything that is not three "/"-separated parts,
 * blank included, is a missing date.
 * @param {string} dateOfBirth
 * @param {Date} now
 * @returns {{ error?: string, birthDate?: CalendarDate }}
 */
function checkDateOfBirth(dateOfBirth, now) {
  const parts = dateOfBirth.split('/')

  if (parts.length !== DATE_PARTS || !parts.every(Boolean)) {
    return { error: 'required' }
  }

  const birthDate = toRealDate(parts)

  if (!birthDate) {
    return { error: 'invalid' }
  }

  if (daysBetween(birthDate, toUkCalendarDate(now)) < 0) {
    return { error: 'future' }
  }

  return { birthDate }
}

/**
 * Provisional, non-blocking late-registration warning. Kept apart from the
 * date rules so it can be removed on its own.
 * @param {CalendarDate} birthDate
 * @param {Date} now
 * @returns {FieldResult[]}
 */
function lateRegistrationWarnings(birthDate, now) {
  return daysBetween(birthDate, toUkCalendarDate(now)) >
    BIRTH_REPORTING_DEADLINE_DAYS
    ? [{ field: 'dateOfBirth', code: 'overDeadline' }]
    : []
}

/**
 * @param {string} breed
 * @returns {string | null} the error code, or null when the breed is listed
 */
function checkBreed(breed) {
  if (breed === '') {
    return 'required'
  }

  return knownBreeds.has(breed) ? null : 'unknown'
}

/**
 * @param {CalfDetailsAnswers} answers
 * @param {Date} now
 * @returns {{ errors: FieldResult[], warnings: FieldResult[] }}
 */
function validateCalfDetails(answers, now) {
  const dateCheck = checkDateOfBirth((answers.dateOfBirth ?? '').trim(), now)
  const codes = {
    earTagNumber:
      (answers.earTagNumber ?? '').trim() === '' ? 'required' : null,
    dateOfBirth: dateCheck.error ?? null,
    sex: SEXES.has(answers.sex) ? null : 'required',
    breed: checkBreed((answers.breed ?? '').trim())
  }
  const errors = Object.entries(codes)
    .filter(([, code]) => code !== null)
    .map(([field, code]) => ({ field, code }))
  const warnings = dateCheck.birthDate
    ? lateRegistrationWarnings(dateCheck.birthDate, now)
    : []

  return { errors, warnings }
}

/**
 * @param {object} [options]
 * @param {() => Date} [options.now] - the current instant; injectable for tests
 * @returns {{ getCalfDetails: Function, saveCalfDetails: Function }}
 */
export function createRegistrationClient({ now = () => new Date() } = {}) {
  return {
    /**
     * @param {{ cph: string, registrationId: string }} _registration
     * @returns {Promise<{ answers: CalfDetailsAnswers }>}
     */
    async getCalfDetails(_registration) {
      return { answers: {} }
    },

    /**
     * Saves the answers when there are no errors. Warnings do not stop a save.
     * @param {{ cph: string, registrationId: string, answers: CalfDetailsAnswers }} registration
     * @returns {Promise<{ errors: FieldResult[], warnings: FieldResult[] }>}
     */
    async saveCalfDetails({ answers }) {
      return validateCalfDetails(answers, now())
    }
  }
}

export const registrationClient = createRegistrationClient()
