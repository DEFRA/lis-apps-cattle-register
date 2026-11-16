import Boom from '@hapi/boom'

import { plainEarTag } from '#server/common/helpers/ear-tag.js'
import {
  be4fe,
  earTagsPath,
  holdingDataPath,
  isNotFound
} from '#server/services/be4fe/client.js'

/**
 * @typedef {object} Dam - one of the holding's animals, as a dam
 * @property {string} earTagNumber
 */

/**
 * @typedef {{ eartag: string, sex?: string | null }} DamResponse
 *   an animal of the holding as the BE4FE answers it
 */

const MALE = 'male'
const BAD_REQUEST = 400
// An animal's id: its ear tag number in capitals with no spaces
const EAR_TAG_ID = /^[0-9A-Z]{1,20}$/

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
 * One of the holding's animals, as a dam. The BE4FE knows an animal by its
 * ear tag number without spaces, whatever its case.
 * @param {{ cph: string, earTagNumber: string }} animal
 * @returns {Promise<Dam | undefined>} undefined for an ear tag number that
 *   is not one of the holding's animals, or is a male's
 */
export async function getDam({ cph, earTagNumber }) {
  const id = plainEarTag(earTagNumber)

  // Nothing else is an animal's id, nor is put in the path of a request
  if (!EAR_TAG_ID.test(id)) {
    return undefined
  }

  try {
    /** @type {{ payload: DamResponse }} */
    const { payload } = await be4fe.get(
      `${holdingDataPath(cph)}/animals/${encodeURIComponent(id)}`
    )

    if (payload.sex?.toLowerCase() === MALE) {
      return undefined
    }

    return { earTagNumber: plainEarTag(payload.eartag) }
  } catch (error) {
    if (isNotFound(error)) {
      return undefined
    }

    throw error
  }
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
