/*
 * The rules for the genetic and surrogate dam step. A calf born via a
 * surrogate dam was born on the holding to the surrogate, so the surrogate is
 * one of the holding's animals that can be a dam. The genetic dam may be
 * anywhere, so any ear tag number is taken for her.
 */
import Joi from 'joi'

import { answer, REQUIRED } from './answer.js'

/**
 * @typedef {object} SurrogateDamAnswers
 * @property {string} [geneticDamEarTagNumber]
 * @property {string} [surrogateDamEarTagNumber]
 */

/**
 * The genetic and surrogate dams, in the order of the fields on the page.
 * Each rule's message is the code of its error, which the page words in its
 * messages.js. Validate it with, as context, `damEarTags` (the ear tags of
 * the holding's possible dams).
 */
export const surrogateDamSchema = Joi.object({
  geneticDamEarTagNumber: answer(),
  surrogateDamEarTagNumber: answer()
    .valid(Joi.in('$damEarTags'))
    .messages({ 'any.only': 'notOnHolding' })
}).messages({ 'any.required': REQUIRED })
