import { getMountPath } from '@defra/lis-hubs-infra-registry'

import { format } from 'date-fns'

import { DATE_FORMAT, toUkDate } from '#server/common/helpers/calendar-date.js'
import { backLinkPath, keepReturn } from '../check-return.js'
import { calfPagePath } from '../paths.js'
import { MAX_FIELD_LENGTH } from '../form-limits.js'
import { getMessage } from './messages.js'
import { breedOptions } from '../validation/calf-details.js'

const PAGE_TITLE = 'Calf details'
const FIELDS = ['earTagNumber', 'dateOfBirth', 'sex', 'breed']

/**
 * @param {object} answers
 * @returns {Record<string, string>} each field's answer, blank when absent
 */
export function formValuesFrom(answers) {
  return Object.fromEntries(
    FIELDS.map((field) => [field, answers[field] ?? ''])
  )
}

/**
 * @param {object} options
 * @param {object} options.request
 * @param {Record<string, string>} options.values
 * @param {string[]} options.earTagItems - the holding's unallocated ear tags
 * @param {{ field: string, code: string }[]} [options.errors]
 * @param {{ field: string, code: string }[]} [options.warnings]
 * @param {string} [options.acknowledgedLateDateOfBirth]
 * @returns {object} the calf details view model
 */
export function buildViewModel({
  request,
  values,
  earTagItems,
  errors = [],
  warnings = [],
  acknowledgedLateDateOfBirth = ''
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
    backLinkHref: backLinkPath(
      request,
      getMountPath('cattle-home', 'holding', { cph })
    ),
    formAction: keepReturn(
      request,
      calfPagePath(cph, submissionId, animalId, 'calf-details')
    ),
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
