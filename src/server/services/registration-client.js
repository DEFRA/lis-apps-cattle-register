/*
 * The cattle-register backend-for-frontend (BE4FE) holds each holding's
 * unsubmitted registration (its "submission") and its calves, and knows the
 * holding's ear tags. It stores whatever it is given: each page validates
 * its answers before asking for a save.
 *
 * Here a calf is one flat record of its answers (a DraftAnimal); the BE4FE
 * holds it as a list of data items, one per answer, keyed by the record's
 * property names. Only this file translates between the two.
 */
import Boom from '@hapi/boom'
import { createServiceClient } from '@defra/lis-hubs-infra-core'
import { format, isValid, parse } from 'date-fns'

import { config } from '#config/config.js'
import { DATE_FORMAT } from '#server/common/helpers/calendar-date.js'

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
 * @typedef {{ 'animal-id': string, status: string }} AnimalSummaryResponse
 *   a calf as the BE4FE lists it in its submission
 */

/**
 * @typedef {{ 'submission-id': string, 'animal-count': number, animals: AnimalSummaryResponse[], status: string, 'created-date': string }} SubmissionResponse
 *   a submission as the BE4FE answers it; animals in the order they were
 *   last saved
 */

/**
 * @typedef {{ 'animal-id': string, status: string, data: DataItem[] }} AnimalResponse
 *   a calf as the BE4FE answers it
 */

/**
 * @typedef {{ status: string, data: DataItem[] }} AnimalRequest
 *   a calf as the BE4FE takes it, replacing whatever it held
 */

// The compose stack publishes the BE4FE on this port (lis-dev
// .tools/compose/cattle-register.yml), so a sideloaded app reaches it there.
const localPort = 8089

const NOT_FOUND = 404
const BAD_REQUEST = 400
// Completing a calf is not built yet: every save leaves it a draft
const DRAFT_STATUS = 'draft'
const STRING_TYPE = 'STRING'
const DATE_TYPE = 'DATE'
// The answers the BE4FE holds as other than text; every other one is text
const ANSWER_TYPES = new Map([['dateOfBirth', DATE_TYPE]])
// A date as the BE4FE holds it: an ISO 8601 calendar date, with no time
const ISO_DATE_FORMAT = 'yyyy-MM-dd'

const service = createServiceClient({
  environment: config.get('environment'),
  serviceName: 'lis-be4fe-cattle-register',
  port: localPort,
  apiKey: config.get('cattleRegisterApi.apiKey'),
  timeout: config.get('cattleRegisterApi.timeout'),
  circuitBreaker: config.get('cattleRegisterApi.circuitBreaker')
})

/**
 * A page about something the BE4FE does not hold is a page that does not
 * exist.
 * @template T
 * @param {Promise<T>} call - a call to the BE4FE
 * @returns {Promise<T>} its answer
 * @throws {Boom.Boom} not found, for a call the BE4FE answers not found
 */
async function notFoundAsBoom(call) {
  try {
    return await call
  } catch (error) {
    if (error.statusCode === NOT_FOUND) {
      throw Boom.notFound()
    }

    throw error
  }
}

// Every call to the BE4FE is made through here
const be4fe = {
  get: (path) => notFoundAsBoom(service.get(path)),
  post: (path, options) => notFoundAsBoom(service.post(path, options)),
  delete: (path) => notFoundAsBoom(service.delete(path))
}

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
 * @param {string} cph - as 12/345/6789
 * @returns {string} the holding's CPH, each part encoded for a path
 */
function encodeCph(cph) {
  return cph.split('/').map(encodeURIComponent).join('/')
}

/**
 * @param {string} cph - as 12/345/6789
 * @returns {string} the path of the holding's submissions
 */
function holdingPath(cph) {
  return `submission/${encodeCph(cph)}`
}

/**
 * @param {{ cph: string, submissionId: string }} submission
 * @returns {string} the path of the submission, under its holding
 */
function submissionPath({ cph, submissionId }) {
  return `${holdingPath(cph)}/${encodeURIComponent(submissionId)}`
}

/**
 * @param {{ cph: string, submissionId: string, animalId: string }} calf
 * @returns {string} the path of the calf in its submission
 */
function animalPath({ cph, submissionId, animalId }) {
  return `${submissionPath({ cph, submissionId })}/${encodeURIComponent(animalId)}`
}

/**
 * @param {string} cph - as 12/345/6789
 * @returns {string} the path of what the BE4FE knows of the holding
 */
function holdingDataPath(cph) {
  return `data/${encodeCph(cph)}`
}

/**
 * @param {string} cph - as 12/345/6789
 * @returns {string} the path of the holding's ear tags
 */
function earTagsPath(cph) {
  return `${holdingDataPath(cph)}/ear-tags`
}

/**
 * @param {Error} error
 * @returns {boolean} whether the BE4FE answered not found
 */
function isNotFound(error) {
  return Boom.isBoom(error, NOT_FOUND)
}

/**
 * Starts the holding's registration, or continues the one it has not
 * submitted.
 * @param {{ cph: string }} holding
 * @returns {Promise<{ submissionId: string, animalId?: string }>} the
 *   registration and its first calf, to continue with; a registration with
 *   no calf yet has no animalId
 */
export async function startRegistration({ cph }) {
  /** @type {{ payload: SubmissionResponse }} */
  const { payload } = await be4fe.get(`${holdingPath(cph)}/start`)
  const [first] = payload.animals ?? []

  return {
    submissionId: payload['submission-id'],
    animalId: first?.['animal-id']
  }
}

/**
 * @param {{ cph: string, submissionId: string }} submission
 * @returns {Promise<{ submissionId: string, status: string, animals: { animalId: string, earTagNumber: string }[] }>}
 *   the submission and its calves, in the order they were last saved; a
 *   calf's ear tag number is its id
 * @throws {Boom.Boom} not found, for a submission the BE4FE does not hold
 *   under the holding
 */
export async function getSubmission({ cph, submissionId }) {
  /** @type {{ payload: SubmissionResponse }} */
  const { payload } = await be4fe.get(submissionPath({ cph, submissionId }))

  return {
    submissionId: payload['submission-id'],
    status: payload.status,
    animals: (payload.animals ?? []).map((animal) => ({
      animalId: animal['animal-id'],
      earTagNumber: animal['animal-id']
    }))
  }
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
  const savedId = values.earTagNumber?.replaceAll(/\s/g, '') ?? animalId
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

/**
 * The ear tags of the holding's animals that can be a dam.
 * @param {{ cph: string }} holding
 * @returns {Promise<string[]>}
 */
export async function getDamEarTags({ cph }) {
  const { payload } = await be4fe.get(`${earTagsPath(cph)}/dams`)
  return (payload.animals ?? []).map(({ eartag }) => eartag)
}

/**
 * The ear tags issued to the holding that are not yet on an animal, nor
 * used by another calf of the submission.
 * @param {{ cph: string, submissionId: string }} submission
 * @returns {Promise<string[]>}
 * @throws {Boom.Boom} not found, for a submission the BE4FE does not hold
 *   under the holding
 */
export async function getUnallocatedEarTags({ cph, submissionId }) {
  try {
    const { payload } = await be4fe.get(
      `${earTagsPath(cph)}/unallocated?submission-id=${encodeURIComponent(submissionId)}`
    )

    return (payload.eartags ?? []).map(({ eartag }) => eartag)
  } catch (error) {
    // Here the BE4FE answers bad request, not not found, for a submission
    // that is another holding's. Either way the page asked for is not one.
    if (error.statusCode === BAD_REQUEST) {
      throw Boom.notFound()
    }

    throw error
  }
}
