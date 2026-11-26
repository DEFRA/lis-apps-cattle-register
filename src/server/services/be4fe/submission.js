import { submissions } from '#server/services/be4fe/client.js'

/** @import Boom from '@hapi/boom' */

export { SUBMITTED_STATUS } from '@defra/lis-hubs-infra-core'

/**
 * Starts the holding's registration, or continues the one it has not
 * submitted.
 * @param {{ cph: string }} holding
 * @returns {Promise<{ submissionId: string, animalId?: string }>} the
 *   registration and its first calf, to continue with; a registration with
 *   no calf yet has no animalId
 */
export async function startRegistration({ cph }) {
  const { submissionId, animals } = await submissions.startSubmission({ cph })

  return { submissionId, animalId: animals[0]?.animalId }
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
  const submission = await submissions.getSubmission({ cph, submissionId })

  return {
    submissionId: submission.submissionId,
    status: submission.status,
    animals: submission.animals.map(({ animalId }) => ({
      animalId,
      earTagNumber: animalId
    }))
  }
}

/**
 * Sends the registration: the BE4FE passes its calves on to be registered,
 * and keeps it unsent if it cannot.
 * @param {{ cph: string, submissionId: string }} submission
 * @returns {Promise<void>}
 * @throws {Boom.Boom} not found, for a submission the BE4FE does not hold
 *   under the holding
 */
export async function submitRegistration({ cph, submissionId }) {
  await submissions.submit({ cph, submissionId })
}
