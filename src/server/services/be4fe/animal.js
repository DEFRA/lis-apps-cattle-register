/*
 * Here a calf is one flat record of its answers (a DraftAnimal); the BE4FE
 * holds it as a list of data items, one per answer, keyed by the record's
 * property names. Only this file translates between the two.
 */
import { format, isValid, parse } from 'date-fns'

import {
  DATE_FORMAT,
  ISO_DATE_FORMAT
} from '#server/common/helpers/calendar-date.js'
import { plainEarTag } from '#server/common/helpers/ear-tag.js'
import { animalPath, be4fe, isNotFound } from '#server/services/be4fe/client.js'

/** @import Boom from '@hapi/boom' */

/**
 * @typedef {object} DraftAnimal - a calf's answers so far, as the BE4FE holds them
 * @property {string} [earTagNumber]
 * @property {string} [dateOfBirth]
 * @property {string} [sex]
 * @property {string} [breed]
 * @property {string} [damType]
 * @property {string} [geneticDamEarTagNumber]
 * @property {string} [surrogateDamEarTagNumber]
 * @property {string | null} [sireEarTagNumber]
 * @property {string | null} [sireName]
 */

/**
 * @typedef {object} CalfKey
 * @property {string} cph - the holding, as 12/345/6789
 * @property {string} submissionId - the BE4FE's submission id
 * @property {string} animalId - the calf's id in the submission: its ear tag
 *   number
 */

/**
 * @typedef {object} DataItem - one of a calf's answers, as the BE4FE holds it
 * @property {string} key - the answer's name: the DraftAnimal property
 * @property {string | null} value - null for an answer given as nothing
 * @property {string} type - STRING, DATE, INT, NUMBER or BOOL
 */

/**
 * @typedef {{ 'animal-id': string, status: string, data: DataItem[] }} AnimalResponse
 *   a calf as the BE4FE answers it
 */
/**
 * @typedef {{ status: string, data: DataItem[] }} AnimalRequest
 *   a calf as the BE4FE takes it, replacing whatever it held
 */

// Completing a calf is not built yet: every save leaves it a draft
const DRAFT_STATUS = 'draft'
const STRING_TYPE = 'STRING'
const DATE_TYPE = 'DATE'
// The answers the BE4FE holds as other than text; every other one is text
const ANSWER_TYPES = new Map([['dateOfBirth', DATE_TYPE]])

/**
 * @param {string | null} value - a date in one form
 * @param {string} from - the form it is in
 * @param {string} to - the form to give it in
 * @returns {string | null} the date in the other form; a value that is not
 *   a date in the first is given as it is
 */
function dateIn(value, from, to) {
  const date = parse(value ?? '', from, new Date())

  return isValid(date) ? format(date, to) : value
}

/**
 * @param {DraftAnimal} values
 * @returns {DataItem[]} one item per answer given, a null answer included
 *   and a date as an ISO date; an absent answer is left out
 */
function toDataItems(values) {
  return Object.entries(values)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => {
      const type = ANSWER_TYPES.get(key) ?? STRING_TYPE

      return {
        key,
        value:
          type === DATE_TYPE
            ? dateIn(value, DATE_FORMAT, ISO_DATE_FORMAT)
            : value,
        type
      }
    })
}

/**
 * @param {DataItem[]} data
 * @returns {DraftAnimal} the answers the items hold, a date as the pages
 *   take it
 */
function fromDataItems(data) {
  return /** @type {DraftAnimal} */ (
    Object.fromEntries(
      data.map(({ key, value, type }) => [
        key,
        type === DATE_TYPE ? dateIn(value, ISO_DATE_FORMAT, DATE_FORMAT) : value
      ])
    )
  )
}

/**
 * @param {CalfKey} calf
 * @returns {Promise<DraftAnimal>} the calf's answers so far
 * @throws {Boom.Boom} not found, for a calf the BE4FE does not hold, as it
 *   answers for a submission it does not hold under the holding, too
 */
export async function getAnimal({ cph, submissionId, animalId }) {
  /** @type {{ payload: AnimalResponse }} */
  const { payload } = await be4fe.get(
    animalPath({ cph, submissionId, animalId })
  )

  return fromDataItems(payload.data ?? [])
}

/**
 * Replaces the calf, adding it to the submission on its first save; the
 * BE4FE then lists it last. A calf's id is its ear tag number: a calf saved
 * with no id is added under the one it is given, and a calf saved with
 * another is saved under that one, then taken out from under its old id.
 * The id is the ear tag number without its spaces, which a URL cannot hold;
 * the answer itself is saved as it is given.
 * @param {{ cph: string, submissionId: string, animalId?: string, values: DraftAnimal }} calf
 *   animalId is the calf's id as it is now; absent for a new calf
 * @returns {Promise<{ animalId: string }>} the calf's id once saved
 */
export async function saveAnimal({ cph, submissionId, animalId, values }) {
  const savedId = values.earTagNumber
    ? plainEarTag(values.earTagNumber)
    : animalId
  /** @type {AnimalRequest} */
  const body = { status: DRAFT_STATUS, data: toDataItems(values) }

  await be4fe.post(animalPath({ cph, submissionId, animalId: savedId }), {
    payload: body
  })

  // One after the other: the BE4FE turns away a second write to a
  // submission that overlaps the first
  if (animalId !== undefined && animalId !== savedId) {
    await removeAnimal({ cph, submissionId, animalId })
  }

  return { animalId: savedId }
}

/**
 * Takes the calf out of the submission; the other calves keep their ids.
 * A calf already gone is left gone. The BE4FE answers not found for a
 * submission it does not hold under the holding just as for a calf, so that is not told apart.
 * @param {CalfKey} calf
 * @returns {Promise<void>}
 */
export async function removeAnimal({ cph, submissionId, animalId }) {
  try {
    await be4fe.delete(animalPath({ cph, submissionId, animalId }))
  } catch (error) {
    if (!isNotFound(error)) {
      throw error
    }
  }
}
