import Boom from '@hapi/boom'
import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'

import * as registrationClient from '#server/services/registration-client.js'
import { trimAnswers } from '@defra/lis-infra-ui-services/journey'
import { registration } from '#server/journeys/register/registration.js'
import { pathAfterSave } from '../check-return.js'
import { submissionPath } from '../paths.js'
import { MAX_CALVES } from '../tag-list/messages.js'
import { buildViewModel, formValuesFrom } from './view-model.js'

/** @import { Request, ResponseObject, ResponseToolkit } from '@hapi/hapi' */
/** @import { DraftAnimal } from '#server/services/registration-client.js' */

const TEMPLATE = 'register/calf-details/index'
const PAGE = 'calf-details'

/**
 * @param {{ submissionId: string, animalId?: string }} calf
 * @returns {Promise<DraftAnimal>} the calf's answers: none for a
 *   calf the submission does not have yet
 * @throws {Error} not found, for an id the submission has no calf under
 */
async function answersOf({ submissionId, animalId }) {
  if (animalId === undefined) {
    return {}
  }

  const animal = await registrationClient.getAnimal({ submissionId, animalId })

  if (!Object.keys(animal).length) {
    throw Boom.notFound()
  }

  return animal
}

/**
 * @param {{ submissionId: string, animalId?: string }} calf
 * @returns {Promise<number | undefined>} how many calves the registration
 *   already has, for a new calf; undefined for one it has
 */
async function calvesBeforeNew({ submissionId, animalId }) {
  if (animalId !== undefined) {
    return undefined
  }

  const { animals } = await registrationClient.getSubmission({ submissionId })

  return animals.length
}

/**
 * @param {number | undefined} calvesBefore - as calvesBeforeNew gives it
 * @returns {boolean} whether the calf is a new one that the registration has
 *   no room for, as the list of calves allows no more; a calf it has is
 *   never turned away
 */
function isFull(calvesBefore) {
  return calvesBefore !== undefined && calvesBefore >= MAX_CALVES
}

export const calfDetailsController = {
  /**
   * Handles the request and returns the response.
   *
   * @param {Request} request - the Hapi request
   * @param {ResponseToolkit} h - the Hapi response toolkit
   * @returns {Promise<ResponseObject>} the response
   */
  async handler(request, h) {
    const { cph, submissionId, animalId } = request.params
    const [animal, earTagItems, calvesBefore] = await Promise.all([
      answersOf({ submissionId, animalId }),
      registrationClient.getUnallocatedEarTags({ cph, submissionId }),
      calvesBeforeNew({ submissionId, animalId })
    ])

    if (isFull(calvesBefore)) {
      return h.redirect(submissionPath(cph, submissionId))
    }

    return h.view(
      TEMPLATE,
      buildViewModel({
        request,
        values: formValuesFrom(animal),
        earTagItems,
        isFirstCalf: calvesBefore === 0
      })
    )
  }
}

export const calfDetailsSubmitController = {
  /**
   * Handles the request and returns the response.
   *
   * @param {Request} request - the Hapi request
   * @param {ResponseToolkit} h - the Hapi response toolkit
   * @returns {Promise<ResponseObject>} the response
   */
  async handler(request, h) {
    const { cph, submissionId, animalId } = request.params
    const { acknowledgedLateDateOfBirth, ...submitted } = request.payload
    const calf = { submissionId, animalId }
    const values = trimAnswers(formValuesFrom(submitted))
    const [animal, earTagItems, calvesBefore] = await Promise.all([
      answersOf(calf),
      registrationClient.getUnallocatedEarTags({ cph, submissionId }),
      calvesBeforeNew(calf)
    ])

    if (isFull(calvesBefore)) {
      return h.redirect(submissionPath(cph, submissionId))
    }

    const { errors, warnings } = registration.validateStep(
      PAGE,
      animal,
      values,
      {
        unallocatedEarTags: earTagItems
      }
    )

    // The late-birth warning is shown once for a date: the page then carries
    // that date in a hidden field, and posting the same date again continues.
    // A changed date is warned about again.
    const isAcknowledged =
      acknowledgedLateDateOfBirth !== '' &&
      acknowledgedLateDateOfBirth === values.dateOfBirth
    const warningsToShow = errors.length || isAcknowledged ? [] : warnings

    if (errors.length || warningsToShow.length) {
      return h
        .view(
          TEMPLATE,
          buildViewModel({
            request,
            values,
            earTagItems,
            isFirstCalf: calvesBefore === 0,
            errors,
            warnings: warningsToShow,
            acknowledgedLateDateOfBirth:
              isAcknowledged || warningsToShow.length ? values.dateOfBirth : ''
          })
        )
        .code(errors.length ? statusCodes.badRequest : statusCodes.ok)
    }

    const saved = registration.withAnswers(PAGE, animal, values)
    // The calf's id follows its ear tag number, so it is the saved calf's id
    // that the next page is about
    const { animalId: savedId } = await registrationClient.saveAnimal({
      ...calf,
      values: saved
    })
    const savedCalf = {
      ...request,
      params: { ...request.params, animalId: savedId }
    }

    return h.redirect(pathAfterSave(savedCalf, PAGE, saved))
  }
}
