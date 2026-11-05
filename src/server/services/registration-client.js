/*
 * TEMPORARY STUB until the cattle-register backend-for-frontend lands
 * (LREG-876/878...). Draft answers and validation belong to that service.
 * Until then answers are held in memory, per instance, in a bounded store
 * (see draft-store.js): not shared between instances, lost on restart, and
 * expired or evicted after a while. The rules below move to that service.
 * Keep the interface (getCalfDetails/saveCalfDetails/getCalf/saveDamDetails/
 * saveGeneticDam/saveSurrogateDam, field + code results, null for a calf the
 * registration does not have) when replacing it with the real client.
 */
/** @import { CalendarDate } from '#server/common/helpers/calendar-date.js' */
import { breedOptions } from '#server/common/helpers/breed-options.js'
import {
  daysBetween,
  toUkCalendarDate
} from '#server/common/helpers/calendar-date.js'
import { createDraftStore } from './draft-store.js'
import { trimAnswers } from './registration-calf-details.js'

const SEXES = new Set(['male', 'female'])
const DAM_TYPES = new Set(['genetic', 'surrogate'])
const FIRST_CALF = 1
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
 * @typedef {object} DamDetailsAnswers
 * @property {string} [damType] - genetic or surrogate
 */

/**
 * @typedef {object} GeneticDamAnswers
 * @property {string} [earTagNumber]
 */

/**
 * @typedef {object} SurrogateDamAnswers
 * @property {string} [geneticDamEarTagNumber]
 * @property {string} [surrogateDamEarTagNumber]
 */

/**
 * @typedef {object} Calf
 * @property {CalfDetailsAnswers} calfDetails
 * @property {DamDetailsAnswers} damDetails
 * @property {GeneticDamAnswers} geneticDam - empty unless damType is genetic
 * @property {SurrogateDamAnswers} surrogateDam - empty unless damType is surrogate
 */

/**
 * @typedef {object} RegistrationKey
 * @property {string} cph
 * @property {string} registrationId
 * @property {string} userId - the user who started the registration
 */

/**
 * @typedef {object} FieldResult
 * @property {'earTagNumber'|'dateOfBirth'|'sex'|'breed'|'damType'|'geneticDamEarTagNumber'|'surrogateDamEarTagNumber'} field
 * @property {string} code
 */

/**
 * @param {string | undefined} text
 * @returns {boolean} true when there is no text other than whitespace
 */
function isBlank(text) {
  return (text ?? '').trim() === ''
}

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
    earTagNumber: isBlank(answers.earTagNumber) ? 'required' : null,
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
 * @param {DamDetailsAnswers} answers
 * @returns {FieldResult[]}
 */
function validateDamDetails(answers) {
  return DAM_TYPES.has(answers.damType)
    ? []
    : [{ field: 'damType', code: 'required' }]
}

/**
 * @param {Record<string, string | undefined>} answers
 * @param {string[]} fields
 * @returns {FieldResult[]} a required error for each blank field, in order
 */
function blankFieldErrors(answers, fields) {
  return fields
    .filter((field) => isBlank(answers[field]))
    .map((field) => ({ field, code: 'required' }))
}

/**
 * @param {GeneticDamAnswers} answers
 * @returns {FieldResult[]}
 */
function validateGeneticDam(answers) {
  return blankFieldErrors(answers, ['earTagNumber'])
}

/**
 * @param {SurrogateDamAnswers} answers
 * @returns {FieldResult[]}
 */
function validateSurrogateDam(answers) {
  return blankFieldErrors(answers, [
    'geneticDamEarTagNumber',
    'surrogateDamEarTagNumber'
  ])
}

/**
 * @param {RegistrationKey} key
 * @returns {string}
 */
function storeKey({ cph, registrationId, userId }) {
  return JSON.stringify([userId, cph, registrationId])
}

/**
 * @param {Calf} calf
 * @returns {Calf} a copy, so callers cannot change what is held
 */
function copyCalf({ calfDetails, damDetails, geneticDam, surrogateDam }) {
  return {
    calfDetails: { ...calfDetails },
    damDetails: { ...damDetails },
    geneticDam: { ...geneticDam },
    surrogateDam: { ...surrogateDam }
  }
}

/**
 * @param {FieldResult[]} warnings
 * @param {string[]} acknowledgedWarnings - warning codes the user confirmed
 * @returns {FieldResult[]} the warnings the user has not confirmed
 */
function unacknowledged(warnings, acknowledgedWarnings) {
  return warnings.filter(({ code }) => !acknowledgedWarnings.includes(code))
}

/**
 * @param {object} store
 * @param {RegistrationKey} key
 * @param {number} calfNumber
 * @returns {Calf | undefined}
 */
function findStoredCalf(store, key, calfNumber) {
  return store.get(storeKey(key))?.[calfNumber - 1]
}

/**
 * Writes the calf back, which also restarts the draft's expiry.
 * @param {object} store
 * @param {RegistrationKey} key
 * @param {number} calfNumber
 * @param {Calf} calf
 */
function saveStoredCalf(store, key, calfNumber, calf) {
  const calves = [...(store.get(storeKey(key)) ?? [])]

  calves[calfNumber - 1] = calf
  store.set(storeKey(key), calves, key.userId)
}

/**
 * Saves the answers, trimmed, about the dam of a calf born via one type of
 * dam, when there are no errors. Throws when the calf was born via the other type.
 * @param {object} store
 * @param {{ damType: string, property: 'geneticDam'|'surrogateDam', validate: (answers: object) => FieldResult[] }} dam
 * @param {RegistrationKey & { calfNumber: number, answers: object }} registration
 * @returns {{ errors: FieldResult[] } | null} null, saving nothing, when
 *   the registration has no such calf
 */
function saveDamAnswers(
  store,
  { damType, property, validate },
  { calfNumber, answers, ...key }
) {
  const calf = findStoredCalf(store, key, calfNumber)

  if (!calf) {
    return null
  }

  if (calf.damDetails.damType !== damType) {
    throw new Error(`Calf ${calfNumber} was not born via a ${damType} dam`)
  }

  const errors = validate(answers)

  if (errors.length === 0) {
    saveStoredCalf(store, key, calfNumber, {
      ...calf,
      [property]: trimAnswers(answers)
    })
  }

  return { errors }
}

const GENETIC_DAM = {
  damType: 'genetic',
  property: 'geneticDam',
  validate: validateGeneticDam
}

const SURROGATE_DAM = {
  damType: 'surrogate',
  property: 'surrogateDam',
  validate: validateSurrogateDam
}

/**
 * @param {object} [options]
 * @param {() => Date} [options.now] - the current instant; injectable for tests
 * @param {object} [options.store] - where drafts are held; injectable for tests
 * @returns {{ getCalfDetails: Function, saveCalfDetails: Function, getCalf: Function, saveDamDetails: Function, saveGeneticDam: Function, saveSurrogateDam: Function }}
 */
export function createRegistrationClient({
  now = () => new Date(),
  store = createDraftStore({ now })
} = {}) {
  const findCalf = (key, calfNumber) => findStoredCalf(store, key, calfNumber)
  const saveCalf = (key, calfNumber, calf) =>
    saveStoredCalf(store, key, calfNumber, calf)

  return {
    /**
     * The first calf's calf details answers, empty until saved.
     * @param {RegistrationKey} key
     * @returns {Promise<{ answers: CalfDetailsAnswers }>}
     */
    async getCalfDetails(key) {
      return { answers: { ...findCalf(key, FIRST_CALF)?.calfDetails } }
    },

    /**
     * Saves the answers, trimmed, as the first calf, only when there are no errors
     * and the user has confirmed every warning; otherwise the saved answers
     * are left as they were.
     * @param {RegistrationKey & { answers: CalfDetailsAnswers, acknowledgedWarnings?: string[] }} registration
     *   acknowledgedWarnings - the codes of the warnings the user confirmed
     * @returns {Promise<{ errors: FieldResult[], warnings: FieldResult[] }>}
     *   the errors, and the warnings not yet confirmed; saved when both are empty
     */
    async saveCalfDetails({ answers, acknowledgedWarnings = [], ...key }) {
      const validation = validateCalfDetails(answers, now())
      const result = {
        errors: validation.errors,
        warnings: unacknowledged(validation.warnings, acknowledgedWarnings)
      }

      if (result.errors.length === 0 && result.warnings.length === 0) {
        const calf = findCalf(key, FIRST_CALF)

        saveCalf(key, FIRST_CALF, {
          calfDetails: trimAnswers(answers),
          damDetails: calf?.damDetails ?? {},
          geneticDam: calf?.geneticDam ?? {},
          surrogateDam: calf?.surrogateDam ?? {}
        })
      }

      return result
    },

    /**
     * @param {RegistrationKey & { calfNumber: number }} registration
     * @returns {Promise<Calf | null>} the calf at that position, from 1, or
     *   null when the registration has no such calf
     */
    async getCalf({ calfNumber, ...key }) {
      const calf = findCalf(key, calfNumber)

      return calf ? copyCalf(calf) : null
    },

    /**
     * Saves the answers when there are no errors. A changed dam type
     * discards the dam answers given for the other type.
     * @param {RegistrationKey & { calfNumber: number, answers: DamDetailsAnswers }} registration
     * @returns {Promise<{ errors: FieldResult[] } | null>} null, saving
     *   nothing, when the registration has no such calf (never started, or
     *   expired or evicted since the page was shown)
     */
    async saveDamDetails({ calfNumber, answers, ...key }) {
      const calf = findCalf(key, calfNumber)

      if (!calf) {
        return null
      }

      const errors = validateDamDetails(answers)

      if (errors.length === 0) {
        const isUnchanged = calf.damDetails.damType === answers.damType

        saveCalf(key, calfNumber, {
          ...calf,
          damDetails: { ...answers },
          geneticDam: isUnchanged ? calf.geneticDam : {},
          surrogateDam: isUnchanged ? calf.surrogateDam : {}
        })
      }

      return { errors }
    },

    /**
     * Saves the answers, trimmed, when there are no errors. Throws when the calf was
     * not born via a genetic dam.
     * @param {RegistrationKey & { calfNumber: number, answers: GeneticDamAnswers }} registration
     * @returns {Promise<{ errors: FieldResult[] } | null>} null, saving
     *   nothing, when the registration has no such calf (never started, or
     *   expired or evicted since the page was shown)
     */
    async saveGeneticDam(registration) {
      return saveDamAnswers(store, GENETIC_DAM, registration)
    },

    /**
     * Saves the answers, trimmed, the surrogate dam and the calf's genetic dam, when
     * there are no errors. Throws when the calf was not born via a surrogate
     * dam.
     * @param {RegistrationKey & { calfNumber: number, answers: SurrogateDamAnswers }} registration
     * @returns {Promise<{ errors: FieldResult[] } | null>} null, saving
     *   nothing, when the registration has no such calf (never started, or
     *   expired or evicted since the page was shown)
     */
    async saveSurrogateDam(registration) {
      return saveDamAnswers(store, SURROGATE_DAM, registration)
    }
  }
}

export const registrationClient = createRegistrationClient()
