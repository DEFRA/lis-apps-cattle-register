/*
 * The cattle-register backend-for-frontend holds each holding's unsubmitted
 * registration (its "submission") and its calves. The BE4FE stores whatever
 * it is given: each page validates its answers before asking for a save.
 *
 * STUBBED: the BE4FE is being rebuilt to the contract below. Until it is
 * there, the submission calls keep their data in this process's memory, one
 * method per call:
 *   GET   /{c}/{p}/{h}/                listSubmissions
 *   GET   /{c}/{p}/{h}/start           startRegistration
 *   GET   /{submissionId}              getSubmission
 *   GET   /{submissionId}/{animalId}   getAnimal
 *   POST  /{submissionId}/{animalId}   saveAnimal
 *   PATCH /{submissionId}/{animalId}   updateAnimal
 *   POST  /{submissionId}              submitRegistration
 * The ear tag lists still go to the real BE4FE.
 */
import { randomInt } from 'node:crypto'

import { createServiceClient } from '@defra/lis-hubs-infra-core'

import { config } from '#config/config.js'

/**
 * @typedef {object} DraftAnimal - a calf's answers so far, as the BE4FE holds them
 * @property {string} [earTagNumber]
 * @property {string} [dateOfBirth]
 * @property {string} [sex]
 * @property {string} [breed]
 * @property {string} [damType]
 * @property {string} [geneticDamEarTagNumber]
 * @property {string} [surrogateDamEarTagNumber]
 */

/**
 * @typedef {object} CalfKey
 * @property {string} submissionId - the BE4FE's submission id
 * @property {string} animalId - the calf's id in the submission: its ear tag
 *   number
 */

// The compose stack publishes the BE4FE on this port (lis-dev
// .tools/compose/cattle-register.yml), so a sideloaded app reaches it there.
const localPort = 8089

const NOT_FOUND = 404
const DRAFT = 'DRAFT'
const SUBMITTED = 'SUBMITTED'
// Crockford base32, as the BE4FE's ids are: no I, L, O or U
const ID_CHARACTERS = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const ID_GROUPS = 3
const ID_GROUP_LENGTH = 3

/**
 * @typedef {object} StubbedSubmission
 * @property {string} submissionId
 * @property {string} cph
 * @property {string} status - DRAFT until it is submitted
 * @property {Map<string, DraftAnimal>} animals - the calves'
 *   answers by id, in the order they were added
 */

/** @type {Map<string, StubbedSubmission>} */
const stubbedSubmissions = new Map()

/**
 * @returns {string} an id in the BE4FE's form, such as 7ZK-M3Q-A9D
 */
function newSubmissionId() {
  return Array.from({ length: ID_GROUPS }, () =>
    Array.from(
      { length: ID_GROUP_LENGTH },
      () => ID_CHARACTERS[randomInt(ID_CHARACTERS.length)]
    ).join('')
  ).join('-')
}

/**
 * @param {string} submissionId
 * @returns {StubbedSubmission}
 * @throws {Error} with statusCode 404, as the BE4FE answers for a submission
 *   it does not hold
 */
function stubbedSubmission(submissionId) {
  const submission = stubbedSubmissions.get(submissionId)

  if (!submission) {
    throw Object.assign(
      new Error(`Submission '${submissionId}' was not found.`),
      { statusCode: NOT_FOUND }
    )
  }

  return submission
}

/**
 * @param {StubbedSubmission} submission
 * @returns {{ submissionId: string, cph: string, status: string }}
 */
function summaryOf({ submissionId, cph, status }) {
  return { submissionId, cph, status }
}

const be4fe = createServiceClient({
  environment: config.get('environment'),
  serviceName: 'lis-be4fe-cattle-register',
  port: localPort,
  apiKey: config.get('cattleRegisterApi.apiKey'),
  timeout: config.get('cattleRegisterApi.timeout'),
  circuitBreaker: config.get('cattleRegisterApi.circuitBreaker')
})

/**
 * Stubbed: see the note at the top of the file.
 * @param {{ cph: string }} holding
 * @returns {Promise<{ submissionId: string, cph: string, status: string }[]>}
 *   the holding's submissions, in the order they were started
 */
export async function listSubmissions({ cph }) {
  return [...stubbedSubmissions.values()]
    .filter((submission) => submission.cph === cph)
    .map(summaryOf)
}

/**
 * Stubbed: see the note at the top of the file. Starts the holding's
 * registration, or continues the one it has not submitted.
 * @param {{ cph: string }} holding
 * @returns {Promise<{ submissionId: string, animalId?: string }>} the
 *   registration and its first calf, to continue with; a registration with
 *   no calf yet has no animalId
 */
export async function startRegistration({ cph }) {
  const draft =
    [...stubbedSubmissions.values()].find(
      (submission) => submission.cph === cph && submission.status === DRAFT
    ) ?? startStubbedSubmission(cph)
  const [animalId] = draft.animals.keys()

  return { submissionId: draft.submissionId, animalId }
}

/**
 * @param {string} cph
 * @returns {StubbedSubmission} a new draft for the holding
 */
function startStubbedSubmission(cph) {
  const submission = {
    submissionId: newSubmissionId(),
    cph,
    status: DRAFT,
    animals: new Map()
  }
  stubbedSubmissions.set(submission.submissionId, submission)

  return submission
}

/**
 * Stubbed: see the note at the top of the file.
 * @param {{ submissionId: string }} submission
 * @returns {Promise<{ submissionId: string, cph: string, status: string, animals: { animalId: string, earTagNumber?: string }[] }>}
 *   the submission and its calves, in the order they were added
 */
export async function getSubmission({ submissionId }) {
  const submission = stubbedSubmission(submissionId)

  return {
    ...summaryOf(submission),
    animals: [...submission.animals].map(([animalId, values]) => ({
      animalId,
      earTagNumber: values.earTagNumber
    }))
  }
}

/**
 * Stubbed: see the note at the top of the file.
 * @param {CalfKey} calf
 * @returns {Promise<DraftAnimal>} the calf's answers so far,
 *   empty before its first save
 */
export async function getAnimal({ submissionId, animalId }) {
  return { ...stubbedSubmission(submissionId).animals.get(animalId) }
}

/**
 * Stubbed: see the note at the top of the file. Replaces the calf, adding
 * it to the submission on its first save. A calf's id is its ear tag number:
 * a calf saved with no id is added under the one it is given, and a calf
 * saved with another takes that as its id and keeps its place.
 * @param {{ submissionId: string, animalId?: string, values: DraftAnimal }} calf
 *   animalId is the calf's id as it is now; absent for a new calf
 * @returns {Promise<{ animalId: string }>} the calf's id once saved
 */
export async function saveAnimal({ submissionId, animalId, values }) {
  const { animals } = stubbedSubmission(submissionId)
  const savedId = values.earTagNumber ?? animalId
  const calves = animals.has(animalId)
    ? [...animals].map(([id, answers]) =>
        id === animalId ? [savedId, { ...values }] : [id, answers]
      )
    : [...animals, [savedId, { ...values }]]

  animals.clear()
  calves.forEach(([id, answers]) => animals.set(id, answers))

  return { animalId: savedId }
}

/**
 * Stubbed: see the note at the top of the file. Replaces the answers given
 * and keeps the calf's others.
 * @param {CalfKey & { values: DraftAnimal }} calf
 * @returns {Promise<void>}
 */
export async function updateAnimal({ submissionId, animalId, values }) {
  const { animals } = stubbedSubmission(submissionId)

  animals.set(animalId, { ...animals.get(animalId), ...values })
}

/**
 * Stubbed: see the note at the top of the file. Sends the registration
 * on, after which the holding's next start is a new one.
 * @param {{ submissionId: string }} submission
 * @returns {Promise<void>}
 */
export async function submitRegistration({ submissionId }) {
  stubbedSubmission(submissionId).status = SUBMITTED
}

/**
 * The ear tags of the holding's animals that can be a dam.
 * @param {{ cph: string }} holding
 * @returns {Promise<string[]>}
 */
export async function getDamEarTags({ cph }) {
  const { payload } = await be4fe.get(
    `data/eartags/dams?cph=${encodeURIComponent(cph)}`
  )
  return (payload.animals ?? []).map(({ eartag }) => eartag)
}

/**
 * The ear tags issued to the holding that are not yet on an animal, nor
 * used by another calf of the submission.
 * @param {{ cph: string, submissionId: string }} submission
 * @returns {Promise<string[]>}
 */
export async function getUnallocatedEarTags({ cph, submissionId }) {
  const { animals } = stubbedSubmission(submissionId)
  const { payload } = await be4fe.get(
    `data/eartags/unallocated?cph=${encodeURIComponent(cph)}`
  )
  const used = new Set(
    [...animals.values()].map(({ earTagNumber }) => earTagNumber)
  )

  return (payload.eartags ?? [])
    .map(({ eartag }) => eartag)
    .filter((eartag) => !used.has(eartag))
}
