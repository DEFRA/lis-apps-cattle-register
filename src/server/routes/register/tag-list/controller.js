import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'

import { registrationClient } from '#server/services/registration-client.js'
import { CHECK_PAGE } from '../check-return.js'
import { calfPagePath, submissionPagePath } from '../paths.js'
import { registration } from '../validation/registration.js'
import { MAX_CALVES } from './messages.js'
import { buildViewModel, FIRST_ANIMAL_ID } from './view-model.js'

/** @import { ListedCalf } from './view-model.js' */

const TEMPLATE = 'register/tag-list/index'
// Not built yet: the prototype continues, once every calf is ready, with
// the page that sends the registration.
const SUBMIT_PAGE = 'submit'

/**
 * Each calf is judged whole against the holding's ear tags and dams as they
 * are now: a calf is ready to send when every page it goes through is
 * answered and still holds.
 * @param {{ cph: string, submissionId: string }} submission
 * @returns {Promise<ListedCalf[]>} the submission's calves, in the order
 *   they were added, each linking to check calf details once ready and
 *   otherwise to the first page to finish
 */
async function listCalves({ cph, submissionId }) {
  const [submission, unallocatedEarTags, damEarTags] = await Promise.all([
    registrationClient.getSubmission({ submissionId }),
    registrationClient.getUnallocatedEarTags({ cph, submissionId }),
    registrationClient.getDamEarTags({ cph })
  ])
  const animals = await Promise.all(
    submission.animals.map(({ animalId }) =>
      registrationClient.getAnimal({ submissionId, animalId })
    )
  )

  return submission.animals.map(({ animalId }, index) => {
    const incomplete = registration.firstIncompleteStep(animals[index], {
      unallocatedEarTags,
      damEarTags
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

/**
 * @param {ListedCalf[]} calves
 * @returns {string} the id for the next calf: one more than the highest
 *   there is, as a cancelled calf leaves the others with their ids
 */
function nextAnimalId(calves) {
  if (!calves.length) {
    return FIRST_ANIMAL_ID
  }

  return String(Math.max(...calves.map(({ animalId }) => Number(animalId))) + 1)
}

export const tagListController = {
  async handler(request, h) {
    const calves = await listCalves(request.params)

    return h.view(TEMPLATE, buildViewModel({ request, calves }))
  }
}

export const tagListSubmitController = {
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
      return h.redirect(
        calfPagePath(cph, submissionId, nextAnimalId(calves), 'calf-details')
      )
    }

    return h.redirect(submissionPagePath(cph, submissionId, SUBMIT_PAGE))
  }
}
