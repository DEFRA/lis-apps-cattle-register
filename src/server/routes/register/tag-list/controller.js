import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'

import * as animalClient from '#server/services/be4fe/animal.js'
import * as submissionClient from '#server/services/be4fe/submission.js'
import * as dataClient from '#server/services/be4fe/data.js'
import { CHECK_PAGE } from '../check-return.js'
import { newCalfPath, submissionPagePath } from '../paths.js'
import { damThatCalvedEarTag } from '../dam-that-calved.js'
import { plainEarTag } from '#server/common/helpers/ear-tag.js'
import { registration } from '#server/journeys/register/registration.js'
import { SUBMIT_PAGE } from '../submit/view-model.js'
import { MAX_CALVES } from './messages.js'
import { buildViewModel } from './view-model.js'

/**
 * @import { Request, ResponseObject, ResponseToolkit } from '@hapi/hapi'
 * @import { ListedCalf } from './view-model.js'
 * @import { DraftAnimal } from '#server/services/be4fe/animal.js'
 * @import { Dam } from '#server/services/be4fe/data.js'
 */

const TEMPLATE = 'register/tag-list/index'

/**
 * @param {DraftAnimal} animal
 * @param {Dam[]} dams - the holding's possible dams
 * @returns {Dam | undefined} the cow that calved; undefined while the calf
 *   has none, or she is not one of the holding's dams
 */
function damThatCalved(animal, dams) {
  const earTagNumber = plainEarTag(damThatCalvedEarTag(animal) ?? '')

  return dams.find((dam) => dam.earTagNumber === earTagNumber)
}

/**
 * Each calf is judged whole against the holding's ear tags and dams as they
 * are now: a calf is ready to send when every page it goes through is
 * answered and still holds.
 * @param {{ cph: string, submissionId: string }} submission
 * @returns {Promise<ListedCalf[]>} the submission's calves, in the order
 *   they were added, each linking to check calf details once ready and
 *   otherwise to the first page to finish
 */
export async function listCalves({ cph, submissionId }) {
  // The dams in one call, however many calves there are
  const [submission, unallocatedEarTags, dams] = await Promise.all([
    submissionClient.getSubmission({ cph, submissionId }),
    dataClient.getUnallocatedEarTags({ cph, submissionId }),
    dataClient.getDams({ cph })
  ])
  const animals = await Promise.all(
    submission.animals.map(({ animalId }) =>
      animalClient.getAnimal({ cph, submissionId, animalId })
    )
  )

  return submission.animals.map(({ animalId }, index) => {
    const incomplete = registration.firstIncompleteStep(animals[index], {
      unallocatedEarTags,
      dam: damThatCalved(animals[index], dams)
    })

    return {
      animalId,
      earTagNumber: animals[index].earTagNumber,
      page: incomplete?.page ?? CHECK_PAGE,
      isReady: !incomplete
    }
  })
}

/**
 * @param {string} addAnother - the answer to "Add more animals"
 * @param {ListedCalf[]} calves
 * @returns {{ field: string, code: string }[]}
 */
function validate(addAnother, calves) {
  if (addAnother === 'yes') {
    return calves.length < MAX_CALVES
      ? []
      : [{ field: 'addAnother', code: 'tooMany' }]
  }

  if (addAnother === 'no' && !calves.length) {
    return [{ field: 'addAnother', code: 'noCalves' }]
  }

  if (addAnother === 'no') {
    return calves.every((calf) => calf.isReady)
      ? []
      : [{ field: 'calves', code: 'incomplete' }]
  }

  return [{ field: 'addAnother', code: 'required' }]
}

export const tagListController = {
  /**
   * Handles the request and returns the response.
   *
   * @param {Request} request - the Hapi request
   * @param {ResponseToolkit} h - the Hapi response toolkit
   * @returns {Promise<ResponseObject>} the response
   */
  async handler(request, h) {
    const calves = await listCalves(request.params)

    return h.view(TEMPLATE, buildViewModel({ request, calves }))
  }
}

export const tagListSubmitController = {
  /**
   * Handles the request and returns the response.
   *
   * @param {Request} request - the Hapi request
   * @param {ResponseToolkit} h - the Hapi response toolkit
   * @returns {Promise<ResponseObject>} the response
   */
  async handler(request, h) {
    const { cph, submissionId } = request.params
    const { addAnother } = request.payload
    const calves = await listCalves(request.params)
    const errors = validate(addAnother, calves)

    if (errors.length) {
      return h
        .view(TEMPLATE, buildViewModel({ request, calves, addAnother, errors }))
        .code(statusCodes.badRequest)
    }

    if (addAnother === 'yes') {
      return h.redirect(newCalfPath(cph, submissionId))
    }

    return h.redirect(submissionPagePath(cph, submissionId, SUBMIT_PAGE))
  }
}
