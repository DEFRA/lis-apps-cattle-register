/*
 * The rules for the genetic and surrogate dam step. A calf born via a
 * surrogate dam was born on the holding to the surrogate, so the surrogate is
 * one of the holding's animals that can be a dam. The genetic dam may be
 * anywhere, so anything is taken for her ear tag number, and it may be left
 * out. One cow is not both dams.
 */
import Joi from 'joi'

import { plainEarTag } from '#server/common/helpers/ear-tag.js'

import { earTagNumber, optionalEarTagNumber, REQUIRED } from './answer.js'
import { DAM_MESSAGES, damThatCalved } from './dam-checks.js'

/** @import { CustomHelpers, ErrorReport } from 'joi' */

/**
 * @typedef {object} SurrogateDamAnswers
 * @property {string | null} [geneticDamEarTagNumber]
 * @property {string} [surrogateDamEarTagNumber]
 */

/**
 * @param {string} one - an ear tag number as typed
 * @param {string} other - another
 * @returns {boolean} true when they are the same number, however each was
 *   spaced and cased
 */
function isSameEarTag(one, other) {
  return plainEarTag(one) === plainEarTag(other)
}

/**
 * A Joi rule for the surrogate dam's ear tag number: the genetic dam is not
 * her own surrogate, whatever else she is, and the surrogate is the cow that
 * calved.
 * @param {string} value
 * @param {CustomHelpers} helpers
 * @returns {string | ErrorReport} the value, for a surrogate dam the rules
 *   allow
 */
function surrogateDam(value, helpers) {
  const [answers] = helpers.state.ancestors

  if (isSameEarTag(value, answers.geneticDamEarTagNumber ?? '')) {
    return helpers.error('any.invalid')
  }

  return damThatCalved(value, helpers)
}

/**
 * The genetic and surrogate dams, in the order of the fields on the page.
 * Each rule's message is the code of its error, which the page words in its
 * messages.js. Validate it with the context dam-checks.js asks for.
 */
export const surrogateDamSchema = Joi.object({
  geneticDamEarTagNumber: optionalEarTagNumber(),
  surrogateDamEarTagNumber: earTagNumber(surrogateDam).messages({
    ...DAM_MESSAGES,
    'any.invalid': 'sameAsGeneticDam'
  })
}).messages({ 'any.required': REQUIRED })
