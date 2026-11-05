/*
 * TEMPORARY STUB until the cattle-register backend-for-frontend lands
 * (LREG-876/878...). Draft answers and validation belong to that service.
 * Until then answers are held in memory, per instance, in a bounded store
 * (see draft-store.js): not shared between instances, lost on restart, and
 * expired or evicted after a while. The rules below move to that service.
 * Keep the interface (getRegistration/getCalfDetails/saveCalfDetails/getCalf/
 * saveDamDetails/saveGeneticDam/saveSurrogateDam/saveSireDetails/confirmCalf/
 * removeCalf, field + code
 * results, null for a registration or calf there is not) when replacing
 * it with the real client.
 */
import { createDraftStore } from './draft-store.js'
import {
  isBlank,
  trimAnswers,
  validateCalfDetails
} from './registration-calf-details.js'
import {
  hasRoomForCalf,
  isAddressableCalf,
  isEarTagTaken
} from './registration-calves.js'
import {
  copyCalf,
  findStoredCalf,
  saveStoredCalf,
  storedCalves,
  storeKey
} from './registration-store.js'

const DAM_TYPES = new Set(['genetic', 'surrogate'])
const FIRST_CALF = 1

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
 * @typedef {object} SireDetailsAnswers - both optional; blank when not known
 * @property {string} [sireEarTagNumber]
 * @property {string} [sireName]
 */

/**
 * @typedef {object} Calf
 * @property {CalfDetailsAnswers} calfDetails
 * @property {DamDetailsAnswers} damDetails
 * @property {GeneticDamAnswers} geneticDam - empty unless damType is genetic
 * @property {SurrogateDamAnswers} surrogateDam - empty unless damType is surrogate
 * @property {SireDetailsAnswers} sireDetails - empty until saved
 * @property {boolean} checked - true once the user has confirmed the
 *   answers on check calf details; saving any answer clears it
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
 * @param {FieldResult[]} warnings
 * @param {string[]} acknowledgedWarnings - warning codes the user confirmed
 * @returns {FieldResult[]} the warnings the user has not confirmed
 */
function unacknowledged(warnings, acknowledgedWarnings) {
  return warnings.filter(({ code }) => !acknowledgedWarnings.includes(code))
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
      [property]: trimAnswers(answers),
      checked: false
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
 * @param {Calf} calf
 * @returns {boolean} true when every page up to check calf details is saved
 */
function isCalfComplete({ damDetails, geneticDam, surrogateDam, sireDetails }) {
  const damAnswers = { genetic: geneticDam, surrogate: surrogateDam }[
    damDetails.damType
  ]

  return [damAnswers ?? {}, sireDetails].every(
    (answers) => Object.keys(answers).length > 0
  )
}

/**
 * @param {object} store
 * @param {RegistrationKey & { calfNumber: number }} registration
 * @returns {{ errors: FieldResult[] } | null} see confirmCalf()
 */
function confirmStoredCalf(store, { calfNumber, ...key }) {
  const calf = findStoredCalf(store, key, calfNumber)

  if (!calf) {
    return null
  }

  if (!isCalfComplete(calf)) {
    throw new Error(`Calf ${calfNumber} has pages not saved`)
  }

  saveStoredCalf(store, key, calfNumber, { ...calf, checked: true })

  return { errors: [] }
}

/**
 * @param {object} store
 * @param {RegistrationKey} key
 * @returns {{ calves: Calf[], canAddCalf: boolean } | null} see
 *   getRegistration()
 */
function findStoredRegistration(store, key) {
  const calves = store.get(storeKey(key))

  if (!calves) {
    return null
  }

  return {
    calves: calves.map(copyCalf),
    canAddCalf: hasRoomForCalf(calves)
  }
}

/**
 * @param {object} store
 * @param {RegistrationKey & { calfNumber: number }} registration
 * @returns {boolean} see removeCalf()
 */
function removeStoredCalf(store, { calfNumber, ...key }) {
  if (!findStoredCalf(store, key, calfNumber)) {
    return false
  }

  store.set(
    storeKey(key),
    storedCalves(store, key).toSpliced(calfNumber - 1, 1),
    key.userId
  )

  return true
}

/**
 * @param {object} store
 * @param {Date} now
 * @param {RegistrationKey & { calfNumber?: number, answers: CalfDetailsAnswers, acknowledgedWarnings?: string[] }} registration
 * @returns {{ errors: FieldResult[], warnings: FieldResult[] } | null} see
 *   saveCalfDetails()
 */
function saveStoredCalfDetails(
  store,
  now,
  { calfNumber = FIRST_CALF, answers, acknowledgedWarnings = [], ...key }
) {
  const calves = storedCalves(store, key)

  if (!isAddressableCalf(calves, calfNumber)) {
    return null
  }

  const validation = validateCalfDetails(answers, now, (earTagNumber) =>
    isEarTagTaken(calves, calfNumber, earTagNumber)
  )
  const result = {
    errors: validation.errors,
    warnings: unacknowledged(validation.warnings, acknowledgedWarnings)
  }

  if (result.errors.length === 0 && result.warnings.length === 0) {
    const calf = calves[calfNumber - 1]

    saveStoredCalf(store, key, calfNumber, {
      calfDetails: trimAnswers(answers),
      damDetails: calf?.damDetails ?? {},
      geneticDam: calf?.geneticDam ?? {},
      surrogateDam: calf?.surrogateDam ?? {},
      sireDetails: calf?.sireDetails ?? {},
      checked: false
    })
  }

  return result
}

/**
 * @param {object} [options]
 * @param {() => Date} [options.now] - the current instant; injectable for tests
 * @param {object} [options.store] - where drafts are held; injectable for tests
 * @returns {{ getRegistration: Function, getCalfDetails: Function, saveCalfDetails: Function, getCalf: Function, saveDamDetails: Function, saveGeneticDam: Function, saveSurrogateDam: Function, saveSireDetails: Function, confirmCalf: Function, removeCalf: Function }}
 */
export function createRegistrationClient({
  now = () => new Date(),
  store = createDraftStore({ now })
} = {}) {
  const findCalf = (key, calfNumber) => findStoredCalf(store, key, calfNumber)
  const saveCalf = (key, calfNumber, calf) =>
    saveStoredCalf(store, key, calfNumber, { ...calf, checked: false })

  return {
    /**
     * @param {RegistrationKey} key
     * @returns {Promise<{ calves: Calf[], canAddCalf: boolean } | null>} the
     *   calves saved so far, in order (none once every calf is removed), and
     *   whether there is room for another; null for a registration never
     *   started, or expired or evicted
     */
    async getRegistration(key) {
      return findStoredRegistration(store, key)
    },

    /**
     * A calf's calf details answers, empty until saved.
     * @param {RegistrationKey & { calfNumber?: number }} registration
     *   calfNumber - from 1; the first calf when left out
     * @returns {Promise<{ answers: CalfDetailsAnswers } | null>} null for a
     *   calf that is neither saved nor the next one there is room for
     */
    async getCalfDetails({ calfNumber = FIRST_CALF, ...key }) {
      if (!isAddressableCalf(storedCalves(store, key), calfNumber)) {
        return null
      }

      return { answers: { ...findCalf(key, calfNumber)?.calfDetails } }
    },

    /**
     * Saves the answers, trimmed, only when there are no errors and the user has
     * confirmed every warning; otherwise the saved answers are left as they
     * were. Another calf in the registration with the same ear tag is an
     * error.
     * @param {RegistrationKey & { calfNumber?: number, answers: CalfDetailsAnswers, acknowledgedWarnings?: string[] }} registration
     *   calfNumber - from 1; the first calf when left out.
     *   acknowledgedWarnings - the codes of the warnings the user confirmed
     * @returns {Promise<{ errors: FieldResult[], warnings: FieldResult[] } | null>}
     *   the errors, and the warnings not yet confirmed, saved when both are
     *   empty; null, saving nothing, for a calf that is neither saved nor
     *   the next one there is room for
     */
    async saveCalfDetails(registration) {
      return saveStoredCalfDetails(store, now(), registration)
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
    },

    /**
     * Saves the answers, trimmed, replacing any saved before so a cleared
     * answer is not kept. Both are optional and nothing is checked against
     * other animals yet, so there are never errors.
     * @param {RegistrationKey & { calfNumber: number, answers: SireDetailsAnswers }} registration
     * @returns {Promise<{ errors: FieldResult[] } | null>} null, saving
     *   nothing, when the registration has no such calf (never started, or
     *   expired or evicted since the page was shown)
     */
    async saveSireDetails({ calfNumber, answers, ...key }) {
      const calf = findCalf(key, calfNumber)

      if (!calf) {
        return null
      }

      saveCalf(key, calfNumber, {
        ...calf,
        sireDetails: {
          sireEarTagNumber: (answers.sireEarTagNumber ?? '').trim(),
          sireName: (answers.sireName ?? '').trim()
        }
      })

      return { errors: [] }
    },

    /**
     * Records that the user has checked and confirmed the calf's answers.
     * Throws when a page before check calf details is not saved.
     * @param {RegistrationKey & { calfNumber: number }} registration
     * @returns {Promise<{ errors: FieldResult[] } | null>} null, saving
     *   nothing, when the registration has no such calf (never started, or
     *   expired or evicted since the page was shown)
     */
    async confirmCalf(registration) {
      return confirmStoredCalf(store, registration)
    },

    /**
     * Removes the calf, so the calves after it each move up one place. The
     * registration is kept, with no calves once the last one is removed.
     * @param {RegistrationKey & { calfNumber: number }} registration
     * @returns {Promise<boolean>} false, changing nothing, when the
     *   registration has no such calf (never started, already removed, or
     *   expired or evicted)
     */
    async removeCalf(registration) {
      return removeStoredCalf(store, registration)
    }
  }
}

export const registrationClient = createRegistrationClient()
