/** @import { Request, ResponseToolkit } from '@hapi/hapi' */
import Boom from '@hapi/boom'

import { registrationClient } from '#server/services/registration-client.js'
import { isSameEarTag } from '#server/services/registration-calves.js'
import { calfPagePath, registrationPagePath } from './paths.js'

/**
 * The id of the signed-in user. A user without one is refused, so that two
 * such users can never share a registration.
 * @param {Request} request
 * @returns {string} the user id
 * @throws {Boom.Boom} a 404, as for any registration the user cannot reach
 */
function demandUserId(request) {
  const userId = request.auth.credentials.user?.sub

  if (typeof userId !== 'string' || userId === '') {
    throw Boom.notFound()
  }

  return userId
}

/**
 * A registration belongs to the user who started it, on one holding.
 * @param {Request} request
 * @returns {{ cph: string, registrationId: string, userId: string }}
 */
export function registrationKey(request) {
  const { cph, registrationId } = request.params

  return {
    cph,
    registrationId,
    userId: demandUserId(request)
  }
}

/**
 * @param {Request} request
 * @returns {Promise<boolean>} true when the registration in the path is
 *   there (not never started, nor expired or evicted)
 */
export async function isRegistrationKnown(request) {
  const registration = await registrationClient.getRegistration(
    registrationKey(request)
  )

  return registration !== null
}

/**
 * The response for a calf the registration does not have. Calf 1 is the
 * calf the calf details page enters, so until it is saved the user is sent
 * back there; so is any calf of a registration there is not (never started,
 * or expired or evicted). Any other missing calf is a page that does not
 * exist.
 * @param {Request} request
 * @param {ResponseToolkit} h
 * @returns {Promise<object>} a redirect or a 404
 */
export async function calfNotFound(request, h) {
  const { cph, registrationId, calfNumber } = request.params

  if (calfNumber === 1 || !(await isRegistrationKnown(request))) {
    return h
      .redirect(registrationPagePath(cph, registrationId, 'calf-details'))
      .takeover()
  }

  return Boom.notFound()
}

/**
 * Route prerequisite for a page about every calf in the registration: a
 * registration there is not (never started, or expired or evicted) is sent
 * to calf details, where its first calf is entered.
 * @param {Request} request
 * @param {ResponseToolkit} h
 * @returns {Promise<object>} the registration
 */
export async function loadRegistration(request, h) {
  const registration = await registrationClient.getRegistration(
    registrationKey(request)
  )

  if (registration) {
    return registration
  }

  const { cph, registrationId } = request.params

  return h
    .redirect(registrationPagePath(cph, registrationId, 'calf-details'))
    .takeover()
}

/**
 * Route prerequisite for a page about one calf: the calf in the path must
 * have its calf details saved, otherwise see calfNotFound().
 * @param {Request} request
 * @param {ResponseToolkit} h
 * @returns {Promise<object>} the saved calf
 */
export async function loadCalf(request, h) {
  return (await findCalf(request)) ?? calfNotFound(request, h)
}

/**
 * Route prerequisite for a form post that copes with a missing calf itself.
 * @param {Request} request
 * @returns {Promise<object | null>} the saved calf in the path, or null
 */
export async function findCalf(request) {
  return registrationClient.getCalf({
    ...registrationKey(request),
    calfNumber: request.params.calfNumber
  })
}

/**
 * @param {object | null} calf - the saved calf, if any
 * @returns {string} its ear tag, as saved, for the form about it to post
 *   back (see demandSameCalf()); blank for a calf not saved yet
 */
export function storedEarTagNumber(calf) {
  return calf?.calfDetails.earTagNumber ?? ''
}

/**
 * Route prerequisite, after loadCalf or findCalf, for a form post about one
 * calf. Calves are addressed by position, and cancelling one moves the
 * calves after it up a place, so a form shown before then (or posted
 * twice) would act on another calf. The form posts back the ear tag of the
 * calf it was shown for; when the calf at that position now has another
 * tag, or there is none, nothing is changed and the user is sent to the
 * list of calves.
 * @param {Request} request
 * @param {ResponseToolkit} h
 * @returns {symbol | object}
 */
export function demandSameCalf(request, h) {
  const { calf } = request.pre
  const { calfEarTagNumber } = request.payload

  if (
    calf &&
    calfEarTagNumber !== undefined &&
    isSameEarTag(calfEarTagNumber, storedEarTagNumber(calf))
  ) {
    return h.continue
  }

  const { cph, registrationId } = request.params

  return h
    .redirect(registrationPagePath(cph, registrationId, 'tag-list'))
    .takeover()
}

/**
 * Route prerequisite, after findCalf, for calf details: as demandSameCalf()
 * for a saved calf; the next calf, not saved yet, has nothing to guard.
 * @param {Request} request
 * @param {ResponseToolkit} h
 * @returns {symbol | object}
 */
export function demandSameCalfIfSaved(request, h) {
  return request.pre.calf ? demandSameCalf(request, h) : h.continue
}

/**
 * Route prerequisite, after loadCalf, for a page about one type of dam: the
 * calf's dam details must have that answer, otherwise the user is sent back
 * to dam details.
 * @param {'genetic'|'surrogate'} damType
 * @returns {(request: Request, h: ResponseToolkit) => Promise<symbol | object>}
 */
export function demandDamType(damType) {
  return async function (request, h) {
    if (request.pre.calf.damDetails.damType === damType) {
      return h.continue
    }

    const { cph, registrationId, calfNumber } = request.params

    return h
      .redirect(calfPagePath(cph, registrationId, calfNumber, 'dam-details'))
      .takeover()
  }
}

/**
 * The page about the dam the calf was born via, by dam type.
 * @param {{ damType?: string }} damDetails
 * @returns {'genetic-dam'|'surrogate-dam'|'dam-details'} dam details when
 *   the dam type is not answered
 */
export function damPage({ damType }) {
  const pages = { genetic: 'genetic-dam', surrogate: 'surrogate-dam' }

  return pages[damType] ?? 'dam-details'
}

/**
 * @param {object} calf - the saved calf
 * @returns {string | null} the first dam page the calf has not completed,
 *   or null when its dam details and the page about its dam are saved
 */
function incompleteDamPage(calf) {
  const page = damPage(calf.damDetails)
  const answers = {
    'genetic-dam': calf.geneticDam,
    'surrogate-dam': calf.surrogateDam
  }[page]

  return answers && isSaved(answers) ? null : page
}

/**
 * @param {object} answers - the answers saved on one page
 * @returns {boolean} true once the page has been saved
 */
function isSaved(answers) {
  return Object.keys(answers).length > 0
}

/**
 * @param {object} calf - the saved calf
 * @returns {string | null} the first page after calf details the calf has
 *   not completed, or null when every page up to check calf details is saved
 */
export function firstIncompletePage(calf) {
  const damPageToComplete = incompleteDamPage(calf)

  if (damPageToComplete) {
    return damPageToComplete
  }

  return isSaved(calf.sireDetails) ? null : 'sire-details'
}

/**
 * @param {Request} request
 * @param {ResponseToolkit} h
 * @param {string | null} page - the page to send the user to, if any
 * @returns {symbol | object}
 */
function continueUnlessIncomplete(request, h, page) {
  if (!page) {
    return h.continue
  }

  const { cph, registrationId, calfNumber } = request.params

  return h
    .redirect(calfPagePath(cph, registrationId, calfNumber, page))
    .takeover()
}

/**
 * Route prerequisite, after loadCalf, for a page after the dam pages: the
 * calf's dam details and the page about its dam must be saved, otherwise
 * the user is sent to the first of them not saved.
 * @param {Request} request
 * @param {ResponseToolkit} h
 * @returns {symbol | object}
 */
export function demandDamComplete(request, h) {
  return continueUnlessIncomplete(
    request,
    h,
    incompleteDamPage(request.pre.calf)
  )
}

/**
 * Route prerequisite, after loadCalf, for check calf details: every page
 * before it must be saved, otherwise the user is sent to the first not saved.
 * @param {Request} request
 * @param {ResponseToolkit} h
 * @returns {symbol | object}
 */
export function demandCalfComplete(request, h) {
  return continueUnlessIncomplete(
    request,
    h,
    firstIncompletePage(request.pre.calf)
  )
}
