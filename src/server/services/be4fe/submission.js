import {
  be4fe,
  holdingPath,
  submissionPath
} from '#server/services/be4fe/client.js'

/** @import Boom from '@hapi/boom' */

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
