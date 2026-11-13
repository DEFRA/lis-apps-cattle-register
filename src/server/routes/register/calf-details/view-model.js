import { getMountPath } from '@defra/lis-hubs-infra-registry'

import { format } from 'date-fns'

import { DATE_FORMAT, toUkDate } from '#server/common/helpers/calendar-date.js'
import { backLinkPath, keepReturn } from '../check-return.js'
import { calfPagePath, submissionPath, newCalfPath } from '../paths.js'
import { MAX_FIELD_LENGTH } from '../form-limits.js'
import { getMessage } from './messages.js'
import { breedOptions } from '#server/journeys/register/calf-details.js'

/** @import { CalfDetailsAnswers } from '#server/journeys/register/calf-details.js' */

const PAGE_TITLE = 'Calf details'
const FIELDS = ['earTagNumber', 'dateOfBirth', 'sex', 'breed']

/**
 * @param {object} answers
 * @returns {Required<CalfDetailsAnswers>} each field's answer, blank when
 *   absent
 */
export function formValuesFrom(answers) {
  return /** @type {any} */ (
    Object.fromEntries(FIELDS.map((field) => [field, answers[field] ?? '']))
  )
}

/**
 * @param {object} options
 * @param {object} options.request
 * @param {Required<CalfDetailsAnswers>} options.values
 * @param {string[]} options.earTagItems - the holding's unallocated ear tags
 * @param {{ field: string, code: string }[]} [options.errors]
 * @param {{ field: string, code: string }[]} [options.warnings]
 * @param {string} [options.acknowledgedLateDateOfBirth]
 * @param {boolean} [options.isFirstCalf] - whether the page is where the
 *   registration starts: a new calf, in a registration with none
 * @returns {object} the calf details view model
 */
export function buildViewModel({
  request,
  values,
  earTagItems,
  errors = [],
  warnings = [],
  acknowledgedLateDateOfBirth = '',
  isFirstCalf = false
}) {
  const { cph, submissionId, animalId } = request.params
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
    // The first calf is where the registration starts; any other is
    // reached from the list of calves.
    backLinkHref: backLinkPath(
      request,
      isFirstCalf
        ? getMountPath('cattle-home', 'holding', { cph })
        : submissionPath(cph, submissionId)
    ),
    formAction: animalId
      ? keepReturn(
          request,
          calfPagePath(cph, submissionId, animalId, 'calf-details')
        )
      : newCalfPath(cph, submissionId),
    values,
    earTagItems,
    breedItems: breedOptions,
    maxFieldLength: MAX_FIELD_LENGTH,
    maxDateOfBirth: format(toUkDate(new Date()), DATE_FORMAT),
    errorList,
    fieldErrors,
    warnings: warnings.map(getMessage),
    acknowledgedLateDateOfBirth
  }
}
