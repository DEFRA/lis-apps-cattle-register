/*
 * What is asked of the cow that calved: that she is one of the holding's
 * possible dams.
 */
import { plainEarTag } from '#server/common/helpers/ear-tag.js'

/** @import { CustomHelpers, ErrorReport } from 'joi' */
/** @import { Dam } from '#server/services/be4fe/data.js' */

const NOT_ON_HOLDING = 'notOnHolding'

// Each rule's message is the code of its error, which the page words
export const DAM_MESSAGES = {
  'any.only': NOT_ON_HOLDING
}

/**
 * A Joi rule for the ear tag number of the cow that calved. Validate with,
 * as context, `dam` (the holding's animal of that ear tag number, as the
 * BE4FE finds it: not a male; undefined when it finds none). An animal
 * found, that is not a male, is one of the holding's dams.
 * @param {string} value
 * @param {CustomHelpers} helpers
 * @returns {string | ErrorReport} the value, for one of the holding's dams;
 *   notOnHolding when no dam is found, or the one found is not of this ear
 *   tag number
 */
export function damThatCalved(value, helpers) {
  const { dam } = helpers.prefs.context
  const earTagNumber = plainEarTag(value)

  if (dam === undefined || dam.earTagNumber !== earTagNumber) {
    return helpers.error('any.only')
  }

  return value
}
