import Boom from '@hapi/boom'
import { getMountPath } from '@defra/lis-hubs-infra-registry'
import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'

import { registrationClient } from '#server/services/registration-client.js'
import { breedOptions } from '#server/common/helpers/breed-options.js'
import {
  formatCalendarDate,
  toUkCalendarDate
} from '#server/common/helpers/calendar-date.js'
import { calfPagePath, registrationPagePath } from '../paths.js'
import { MAX_FIELD_LENGTH } from '../form-limits.js'
import { registrationKey } from '../registration.js'
import { formErrors } from '../form-errors.js'
import { backLinkPath, keepReturn, pathAfterSave } from '../check-return.js'
import { getMessage } from './messages.js'

const TEMPLATE = 'register/calf-details/index'
const PAGE_TITLE = 'Calf details'
const FIELDS = ['earTagNumber', 'dateOfBirth', 'sex', 'breed']
const LATE_DATE_OF_BIRTH_WARNING = 'overDeadline'
const TAG_LIST_PAGE = 'tag-list'

/**
 * @param {object} answers
 * @returns {Record<string, string>} each field's answer, blank when absent
 */
function formValuesFrom(answers) {
  return Object.fromEntries(
    FIELDS.map((field) => [field, answers[field] ?? ''])
  )
}

/**
 * @param {object} request
 * @returns {Promise<boolean>} true once the registration has a saved calf
 */
async function hasSavedCalf(request) {
  const registration = await registrationClient.getRegistration(
    registrationKey(request)
  )

  return (registration?.calves.length ?? 0) > 0
}

/**
 * @param {object} request
 * @returns {Promise<string>} the page before calf details: the list of
 *   calves, except for the first calf of a registration with no calf saved
 *   yet, where the registration starts from the holding
 */
async function previousPath(request) {
  const { cph, registrationId, calfNumber } = request.params

  if (calfNumber === 1 && !(await hasSavedCalf(request))) {
    return getMountPath('cattle-home', 'holding', { cph })
  }

  return registrationPagePath(cph, registrationId, TAG_LIST_PAGE)
}

/**
 * @param {object} options
 * @param {object} options.request
 * @param {string} options.previous - see previousPath()
 * @param {Record<string, string>} options.values
 * @param {{ field: string, code: string }[]} [options.errors]
 * @param {{ field: string, code: string }[]} [options.warnings]
 * @param {string} [options.acknowledgedLateDateOfBirth]
 * @returns {object} the calf details view model
 */
function buildViewModel({
  request,
  previous,
  values,
  errors = [],
  warnings = [],
  acknowledgedLateDateOfBirth = ''
}) {
  const { cph, registrationId, calfNumber } = request.params
  const { errorList, fieldErrors } = formErrors(errors, getMessage)

  return {
    pageTitle: errors.length ? `Error: ${PAGE_TITLE}` : PAGE_TITLE,
    heading: PAGE_TITLE,
    backLinkHref: backLinkPath(request, calfNumber, previous),
    formAction: keepReturn(
      request,
      calfPagePath(cph, registrationId, calfNumber, 'calf-details')
    ),
    values,
    breedItems: breedOptions,
    maxFieldLength: MAX_FIELD_LENGTH,
    maxDateOfBirth: formatCalendarDate(toUkCalendarDate(new Date())),
    errorList,
    fieldErrors,
    warnings: warnings.map(getMessage),
    acknowledgedLateDateOfBirth
  }
}

export const calfDetailsController = {
  async handler(request, h) {
    const saved = await registrationClient.getCalfDetails({
      ...registrationKey(request),
      calfNumber: request.params.calfNumber
    })

    if (!saved) {
      return Boom.notFound()
    }

    const { answers } = saved

    return h.view(
      TEMPLATE,
      buildViewModel({
        request,
        previous: await previousPath(request),
        values: formValuesFrom(answers)
      })
    )
  }
}

export const calfDetailsSubmitController = {
  async handler(request, h) {
    const { cph, registrationId, calfNumber } = request.params
    const { acknowledgedLateDateOfBirth, ...submitted } = request.payload
    const values = formValuesFrom(submitted)

    // The late-birth warning is shown once for a date: the page then carries
    // that date in a hidden field, and posting the same date again confirms
    // it. A changed date is warned about again. Nothing is saved until the
    // warning is confirmed.
    const isAcknowledged =
      acknowledgedLateDateOfBirth !== '' &&
      acknowledgedLateDateOfBirth === values.dateOfBirth
    const result = await registrationClient.saveCalfDetails({
      ...registrationKey(request),
      calfNumber,
      answers: values,
      acknowledgedWarnings: isAcknowledged ? [LATE_DATE_OF_BIRTH_WARNING] : []
    })

    // The calves before this one have expired, or been evicted, since the
    // page was shown.
    if (!result) {
      return Boom.notFound()
    }

    const { errors, warnings } = result
    const warningsToShow = errors.length ? [] : warnings

    if (errors.length || warningsToShow.length) {
      return h
        .view(
          TEMPLATE,
          buildViewModel({
            request,
            previous: await previousPath(request),
            values,
            errors,
            warnings: warningsToShow,
            acknowledgedLateDateOfBirth:
              isAcknowledged || warningsToShow.length ? values.dateOfBirth : ''
          })
        )
        .code(errors.length ? statusCodes.badRequest : statusCodes.ok)
    }

    return h.redirect(
      await pathAfterSave(
        request,
        calfNumber,
        calfPagePath(cph, registrationId, calfNumber, 'dam-details')
      )
    )
  }
}
