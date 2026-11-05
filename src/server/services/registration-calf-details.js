/*
 * TEMPORARY calf details rules behind the stub registration client, until
 * the cattle-register backend-for-frontend (LREG-876/878...) owns them and
 * this module is deleted.
 */
import { breedOptions } from '#server/common/helpers/breed-options.js'
import {
  checkDateOfBirth,
  lateRegistrationWarnings
} from './registration-date-of-birth.js'

/** @import { CalfDetailsAnswers, FieldResult } from './registration-client.js' */

const SEXES = new Set(['male', 'female'])
const knownBreeds = new Set(breedOptions)

/**
 * @param {string | undefined} text
 * @returns {boolean} true when there is no text other than whitespace
 */
export function isBlank(text) {
  return (text ?? '').trim() === ''
}

/**
 * @param {Record<string, string | undefined>} answers
 * @returns {Record<string, string | undefined>} a copy with each answer
 *   trimmed, as it is stored
 */
export function trimAnswers(answers) {
  return Object.fromEntries(
    Object.entries(answers).map(([field, answer]) => [field, answer?.trim()])
  )
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
 * @param {string | undefined} earTagNumber
 * @param {(earTagNumber: string) => boolean} isTaken
 * @returns {string | null} the error code, or null when the tag can be used
 */
function checkEarTag(earTagNumber, isTaken) {
  if (isBlank(earTagNumber)) {
    return 'required'
  }

  return isTaken(earTagNumber) ? 'duplicate' : null
}

/**
 * @param {CalfDetailsAnswers} answers
 * @param {Date} now
 * @param {(earTagNumber: string) => boolean} isTaken - true for an ear tag
 *   another calf in the registration has
 * @returns {{ errors: FieldResult[], warnings: FieldResult[] }}
 */
export function validateCalfDetails(answers, now, isTaken) {
  const dateCheck = checkDateOfBirth((answers.dateOfBirth ?? '').trim(), now)
  const codes = {
    earTagNumber: checkEarTag(answers.earTagNumber, isTaken),
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
