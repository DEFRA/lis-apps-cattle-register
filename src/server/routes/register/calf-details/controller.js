import { getMountPath } from '@defra/lis-hubs-infra-registry'
import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'

import { registrationClient } from '#server/services/registration-client.js'
import { breedOptions } from '#server/common/helpers/breed-options.js'
import {
  formatCalendarDate,
  toUkCalendarDate
} from '#server/common/helpers/calendar-date.js'
import { registrationPagePath } from '../paths.js'
import { getMessage } from './messages.js'

const TEMPLATE = 'register/calf-details/index'
const PAGE_TITLE = 'Calf details'
const FIELDS = ['earTagNumber', 'dateOfBirth', 'sex', 'breed']

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
 * @param {object} options
 * @param {object} options.request
 * @param {Record<string, string>} options.values
 * @param {{ field: string, code: string }[]} [options.errors]
 * @param {{ field: string, code: string }[]} [options.warnings]
 * @param {string} [options.acknowledgedLateDateOfBirth]
 * @returns {object} the calf details view model
 */
function buildViewModel({
  request,
  values,
  errors = [],
  warnings = [],
  acknowledgedLateDateOfBirth = ''
}) {
  const { cph, registrationId } = request.params
  const errorList = errors.map((error) => ({
    text: getMessage(error),
    href: `#${error.field}`
  }))
  const fieldErrors = Object.fromEntries(
    errors.map((error) => [error.field, { text: getMessage(error) }])
  )

  return {
    pageTitle: errors.length ? `Error: ${PAGE_TITLE}` : PAGE_TITLE,
    heading: PAGE_TITLE,
    backLinkHref: getMountPath('cattle-home', 'holding', { cph }),
    formAction: registrationPagePath(cph, registrationId, 'calf-details'),
    values,
    breedItems: breedOptions,
    maxDateOfBirth: formatCalendarDate(toUkCalendarDate(new Date())),
    errorList,
    fieldErrors,
    warnings: warnings.map(getMessage),
    acknowledgedLateDateOfBirth
  }
}

export const calfDetailsController = {
  async handler(request, h) {
    const { cph, registrationId } = request.params
    const { answers } = await registrationClient.getCalfDetails({
      cph,
      registrationId
    })

    return h.view(
      TEMPLATE,
      buildViewModel({ request, values: formValuesFrom(answers) })
    )
  }
}

export const calfDetailsSubmitController = {
  async handler(request, h) {
    const { cph, registrationId } = request.params
    const { acknowledgedLateDateOfBirth, ...submitted } = request.payload
    const values = formValuesFrom(submitted)
    const { errors, warnings } = await registrationClient.saveCalfDetails({
      cph,
      registrationId,
      answers: values
    })

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
            errors,
            warnings: warningsToShow,
            acknowledgedLateDateOfBirth:
              isAcknowledged || warningsToShow.length ? values.dateOfBirth : ''
          })
        )
        .code(errors.length ? statusCodes.badRequest : statusCodes.ok)
    }

    return h.redirect(registrationPagePath(cph, registrationId, 'dam-details'))
  }
}
