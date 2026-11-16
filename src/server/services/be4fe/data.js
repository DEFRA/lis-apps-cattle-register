import Boom from '@hapi/boom'

import { be4fe, earTagsPath } from '#server/services/be4fe/client.js'

const BAD_REQUEST = 400

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
