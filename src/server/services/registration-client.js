/*
 * The cattle-register backend-for-frontend holds each holding's unsubmitted
 * registration (its "submission") as animals, each with named sections of
 * untyped key/value data. This client keeps one section per page of a calf,
 * with the page's answers as its keys. The BE4FE stores whatever it is
 * given: each page validates its answers before asking for a save.
 */
/** @import { CalfDetailsAnswers } from '#server/routes/register/calf-details/validation.js' */
import { BaseClient } from '@defra/lis-hubs-infra-core'

import { config } from '#config/config.js'

/**
 * @typedef {object} CalfKey
 * @property {string} submissionId - the BE4FE's submission id
 * @property {string} animalId - the calf's id in the submission: its number,
 *   from 1, as a string
 */

const CALF_DETAILS_SECTION = 'CALF-DETAILS'
const FIRST_ANIMAL_ID = '1'
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
   * @param {CalfKey} calf
   * @param {string} section
   * @returns {Promise<Record<string, string>>} the answers saved in the
   *   section, empty when nothing has been
   */
  async #getAnimalSection({ submissionId, animalId }, section) {
    const { payload } = await this._get(
      `submission/${encodeURIComponent(submissionId)}/${encodeURIComponent(animalId)}/${section}`
    )
    return fromData(payload.data ?? [])
  }

  /**
   * Saves a page's answers as the animal's section, replacing what the
   * section held. Adds the animal to the submission when it is new.
   * @param {CalfKey} calf
   * @param {string} section
   * @param {Record<string, string>} answers
   * @returns {Promise<void>}
   */
  async #updateAnimalSection({ submissionId, animalId }, section, answers) {
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
   * Starts the holding's registration, or continues the one it has. The
   * BE4FE adds a calf on its first save, under whatever id it is given, so
   * calves are numbered from 1 and a new registration's calf is 1.
   * @param {{ cph: string }} holding
   * @returns {Promise<CalfKey>} the registration's calf, to continue with
   */
  async startRegistration({ cph }) {
    const { payload } = await this._get(
      `submission/start?cph=${encodeURIComponent(cph)}`
    )
    const [animal] = payload.animals ?? []
    return {
      submissionId: payload['submission-id'],
      animalId: animal?.['animal-id'] ?? FIRST_ANIMAL_ID
    }
  }

  /**
   * The ear tags issued to the holding that are not yet on an animal, nor
   * used by another calf of the submission.
   * @param {{ cph: string, submissionId: string }} submission
   * @returns {Promise<string[]>}
   */
  async getUnallocatedEarTags({ cph, submissionId }) {
    const { payload } = await this._get(
      `data/eartags/unallocated?cph=${encodeURIComponent(cph)}&submission-id=${encodeURIComponent(submissionId)}`
    )
    return (payload.eartags ?? []).map(({ eartag }) => eartag)
  }

  /**
   * @param {CalfKey} calf
   * @returns {Promise<CalfDetailsAnswers>} the calf's saved answers, empty
   *   before its first save
   */
  getCalfDetails(calf) {
    return this.#getAnimalSection(calf, CALF_DETAILS_SECTION)
  }

  /**
   * Saves the calf's answers, validated by the page, replacing what was
   * saved. The calf is added to the submission on its first save.
   * @param {CalfKey & { answers: CalfDetailsAnswers }} calf
   * @returns {Promise<void>}
   */
  saveCalfDetails({ answers, ...calf }) {
    return this.#updateAnimalSection(calf, CALF_DETAILS_SECTION, answers)
  }
}

export const registrationClient = new CattleRegisterBe4FeClient({
  environment: config.get('environment'),
  apiKey: config.get('cattleRegisterApi.apiKey'),
  timeout: config.get('cattleRegisterApi.timeout'),
  circuitBreaker: config.get('cattleRegisterApi.circuitBreaker')
})
