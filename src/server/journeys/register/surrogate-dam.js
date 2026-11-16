/*
 * The rules for the genetic and surrogate dam step. A calf born via a
 * surrogate dam was born on the holding to the surrogate, so the surrogate is
 * one of the holding's animals that can be a dam. The genetic dam may be
 * anywhere, so anything is taken for her ear tag number, and it may be left
 * out. One cow is not both dams.
 */
import Joi from 'joi'

import { plainEarTag } from '#server/common/helpers/ear-tag.js'

import { answer, optionalAnswer, REQUIRED } from './answer.js'
import { DAM_MESSAGES, damThatCalved } from './dam-checks.js'

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
 * The genetic and surrogate dams, in the order of the fields on the page.
 * Each rule's message is the code of its error, which the page words in its
 * messages.js. Validate it with the context dam-checks.js asks for.
 */
export const surrogateDamSchema = Joi.object({
  geneticDamEarTagNumber: optionalAnswer(),
  // The genetic dam is not her own surrogate, whatever else she is
  surrogateDamEarTagNumber: answer()
    .custom((value, helpers) => {
      const [answers] = helpers.state.ancestors
      if (isSameEarTag(value, answers.geneticDamEarTagNumber ?? '')) {
        return helpers.error('any.invalid')
      }
      return damThatCalved(value, helpers)
    })
    .messages({ ...DAM_MESSAGES, 'any.invalid': 'sameAsGeneticDam' })
}).messages({ 'any.required': REQUIRED })
