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
 * The ear tag list still goes to the real BE4FE.
 */
import { randomInt } from 'node:crypto'

import { BaseClient } from '@defra/lis-hubs-infra-core'

import { config } from '#config/config.js'

/**
 * @typedef {object} CalfKey
 * @property {string} submissionId - the BE4FE's submission id
 * @property {string} animalId - the calf's id in the submission: its number,
 *   from 1, as a string
 */

// The compose stack publishes the BE4FE on this port (lis-dev
// .tools/compose/cattle-register.yml), so a sideloaded app reaches it there.
const localPort = 8089
const FIRST_ANIMAL_ID = '1'

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
 * @property {Map<string, Record<string, string>>} animals - the calves'
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

class CattleRegisterBe4FeClient extends BaseClient {
  /**
   * @param {object} options
   * @param {string} options.environment 'local' | 'docker_compose' | 'dev' | 'test' | 'ext-test' | 'perf-test' | 'prod'
   * @param {string} [options.apiKey] API key sent to the cattle-register BE4FE as x-api-key
   * @param {number} [options.timeout] total milliseconds allowed for the response headers and body
   * @param {{ failureThreshold?: number, resetTimeout?: number }} [options.circuitBreaker] circuit breaker settings; see BaseClient for the defaults
   */
  constructor({ environment, apiKey, timeout, circuitBreaker }) {
    super({
      environment,
      serviceName: 'lis-be4fe-cattle-register',
      port: localPort,
      apiKey,
      timeout,
      circuitBreaker
    })
  }

  /**
   * Stubbed: see the note at the top of the file.
   * @param {{ cph: string }} holding
   * @returns {Promise<{ submissionId: string, cph: string, status: string }[]>}
   *   the holding's submissions, in the order they were started
   */
  async listSubmissions({ cph }) {
    return [...stubbedSubmissions.values()]
      .filter((submission) => submission.cph === cph)
      .map(summaryOf)
  }

  /**
   * Stubbed: see the note at the top of the file. Starts the holding's
   * registration, or continues the one it has not submitted. A calf is added
   * on its first save, under whatever id it is given, so calves are numbered
   * from 1 and a new registration's calf is 1.
   * @param {{ cph: string }} holding
   * @returns {Promise<CalfKey>} the registration's calf, to continue with
   */
  async startRegistration({ cph }) {
    const draft =
      [...stubbedSubmissions.values()].find(
        (submission) => submission.cph === cph && submission.status === DRAFT
      ) ?? this._startStubbedSubmission(cph)
    const [animalId = FIRST_ANIMAL_ID] = draft.animals.keys()

    return { submissionId: draft.submissionId, animalId }
  }

  /**
   * @param {string} cph
   * @returns {StubbedSubmission} a new draft for the holding
   */
  _startStubbedSubmission(cph) {
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
  async getSubmission({ submissionId }) {
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
   * @returns {Promise<Record<string, string>>} the calf's answers so far,
   *   empty before its first save
   */
  async getAnimal({ submissionId, animalId }) {
    return { ...stubbedSubmission(submissionId).animals.get(animalId) }
  }

  /**
   * Stubbed: see the note at the top of the file. Replaces the calf, adding
   * it to the submission on its first save.
   * @param {CalfKey & { values: Record<string, string> }} calf
   * @returns {Promise<void>}
   */
  async saveAnimal({ submissionId, animalId, values }) {
    stubbedSubmission(submissionId).animals.set(animalId, { ...values })
  }

  /**
   * Stubbed: see the note at the top of the file. Replaces the answers given
   * and keeps the calf's others.
   * @param {CalfKey & { values: Record<string, string> }} calf
   * @returns {Promise<void>}
   */
  async updateAnimal({ submissionId, animalId, values }) {
    const { animals } = stubbedSubmission(submissionId)

    animals.set(animalId, { ...animals.get(animalId), ...values })
  }

  /**
   * Stubbed: see the note at the top of the file. Sends the registration
   * on, after which the holding's next start is a new one.
   * @param {{ submissionId: string }} submission
   * @returns {Promise<void>}
   */
  async submitRegistration({ submissionId }) {
    stubbedSubmission(submissionId).status = SUBMITTED
  }

  /**
   * The ear tags issued to the holding that are not yet on an animal, nor
   * used by another calf of the submission.
   * @param {{ cph: string, submissionId: string }} submission
   * @returns {Promise<string[]>}
   */
  async getUnallocatedEarTags({ cph, submissionId }) {
    const { animals } = stubbedSubmission(submissionId)
    const { payload } = await this._get(
      `data/eartags/unallocated?cph=${encodeURIComponent(cph)}`
    )
    const used = new Set(
      [...animals.values()].map(({ earTagNumber }) => earTagNumber)
    )

    return (payload.eartags ?? [])
      .map(({ eartag }) => eartag)
      .filter((eartag) => !used.has(eartag))
  }
}

export const registrationClient = new CattleRegisterBe4FeClient({
  environment: config.get('environment'),
  apiKey: config.get('cattleRegisterApi.apiKey'),
  timeout: config.get('cattleRegisterApi.timeout'),
  circuitBreaker: config.get('cattleRegisterApi.circuitBreaker')
})
