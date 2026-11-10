/*
 * The cattle-register backend-for-frontend holds each holding's unsubmitted
 * registration (its "submission") as animals, each with named sections of
 * untyped key/value data. This client keeps one section per page of a calf,
 * with the page's answers as its keys. The BE4FE stores whatever it is
 * given: each page validates its answers before asking for a save.
 */
/** @import { CalfDetailsAnswers } from '#server/routes/register/calf-details/validation.js' */
import { randomUUID } from 'node:crypto'
import { BaseClient } from '@defra/lis-hubs-infra-core'

import { config } from '#config/config.js'

/**
 * @typedef {object} SubmissionKey
 * @property {string} cph
 * @property {string} submissionId - the BE4FE's submission id
 */

/**
 * @typedef {object} Submission
 * @property {string} submissionId
 * @property {string[]} animalIds - in the order they were added
 */

const CALF_DETAILS_SECTION = 'CALF-DETAILS'
const DRAFT = 'DRAFT'
const STRING = 'STRING'

// The compose stack publishes the BE4FE on this port (lis-dev
// .tools/compose/cattle-register.yml), so a sideloaded app reaches it there.
const localPort = 8089

/**
 * @param {Record<string, string>} answers
 * @returns {{ key: string, value: string, type: string }[]} the section's data
 */
function toData(answers) {
  return Object.entries(answers).map(([key, value]) => ({
    key,
    value,
    type: STRING
  }))
}

/**
 * @param {{ key: string, value: string }[]} data - a section's data
 * @returns {Record<string, string>} the answers, empty when nothing is saved
 */
function fromData(data) {
  return Object.fromEntries(data.map(({ key, value }) => [key, value]))
}

/**
 * @param {string} submissionId
 * @param {string} otherSubmissionId
 * @returns {boolean} true when both name the same submission; the ids are
 *   case-insensitive
 */
function isSameSubmission(submissionId, otherSubmissionId) {
  return submissionId.toUpperCase() === otherSubmissionId.toUpperCase()
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
   * The holding's submission in progress, started when it has none.
   * @param {string} cph holding identifier, e.g. '10/081/1234'
   * @returns {Promise<Submission>}
   */
  async #startSubmission(cph) {
    const { payload } = await this._get(
      `submission/start?cph=${encodeURIComponent(cph)}`
    )
    return {
      submissionId: payload['submission-id'],
      animalIds: (payload.animals ?? []).map((animal) => animal['animal-id'])
    }
  }

  /**
   * @param {SubmissionKey} key
   * @returns {Promise<Submission | null>} the holding's submission when it is the
   *   registration in the key; null when that registration is not the
   *   holding's current submission (never started, submitted, or another holding's)
   */
  async #findSubmission({ cph, submissionId }) {
    const submission = await this.#startSubmission(cph)
    return isSameSubmission(submission.submissionId, submissionId)
      ? submission
      : null
  }

  /**
   * @param {string} submissionId
   * @param {string} animalId
   * @param {string} section
   * @returns {Promise<Record<string, string>>} the answers saved in the
   *   section, empty when nothing has been
   */
  async #getAnimalSection(submissionId, animalId, section) {
    const { payload } = await this._get(
      `submission/${encodeURIComponent(submissionId)}/${encodeURIComponent(animalId)}/${section}`
    )
    return fromData(payload.data ?? [])
  }

  /**
   * Saves a page's answers as the animal's section, replacing what the
   * section held. Adds the animal to the submission when it is new.
   * @param {string} submissionId
   * @param {string} animalId
   * @param {string} section
   * @param {Record<string, string>} answers
   * @returns {Promise<void>}
   */
  async #updateAnimalSection(submissionId, animalId, section, answers) {
    await this._post(`submission/${encodeURIComponent(submissionId)}:update`, {
      payload: {
        'animal-id': animalId,
        section,
        status: DRAFT,
        data: toData(answers)
      }
    })
  }

  /**
   * Starts the holding's registration, or continues the one it has.
   * @param {{ cph: string }} holding
   * @returns {Promise<{ submissionId: string }>} the registration to
   *   continue with
   */
  async startRegistration({ cph }) {
    const { submissionId } = await this.#startSubmission(cph)
    return { submissionId }
  }

  /**
   * @param {SubmissionKey} key
   * @returns {Promise<{ answers: CalfDetailsAnswers } | null>} the saved
   *   answers of the registration's calf, empty before its first save;
   *   null when the submission is not the holding's current one
   */
  async getCalfDetails(key) {
    const submission = await this.#findSubmission(key)
    if (!submission) {
      return null
    }
    const [animalId] = submission.animalIds
    if (!animalId) {
      return { answers: {} }
    }
    const answers = await this.#getAnimalSection(
      submission.submissionId,
      animalId,
      CALF_DETAILS_SECTION
    )
    return { answers }
  }

  /**
   * Saves the calf's answers, validated by the page, replacing what was
   * saved. The calf is added to the submission on its first save.
   * @param {SubmissionKey & { answers: CalfDetailsAnswers }} registration
   * @returns {Promise<boolean>} false, saving nothing, when the registration
   *   is not the holding's current one
   */
  async saveCalfDetails({ answers, ...key }) {
    const submission = await this.#findSubmission(key)
    if (!submission) {
      return false
    }
    await this.#updateAnimalSection(
      submission.submissionId,
      submission.animalIds[0] ?? randomUUID(),
      CALF_DETAILS_SECTION,
      answers
    )
    return true
  }
}

export const registrationClient = new CattleRegisterBe4FeClient({
  environment: config.get('environment'),
  apiKey: config.get('cattleRegisterApi.apiKey'),
  timeout: config.get('cattleRegisterApi.timeout'),
  circuitBreaker: config.get('cattleRegisterApi.circuitBreaker')
})
