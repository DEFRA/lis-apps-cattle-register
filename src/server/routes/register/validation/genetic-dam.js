/*
 * The rules for the genetic dam step. A calf born via its genetic dam was
 * born on the holding, so its dam is one of the holding's animals that can
 * be a dam.
 */
import Joi from 'joi'

import { answer, REQUIRED } from './answer.js'

/**
 * @typedef {object} GeneticDamAnswers
 * @property {string} [geneticDamEarTagNumber]
 */

/**
 * The genetic dam. Each rule's message is the code of its error, which the
 * page words in its messages.js. Validate it with, as context, `damEarTags`
 * (the ear tags of the holding's possible dams).
 */
export const geneticDamSchema = Joi.object({
  geneticDamEarTagNumber: answer()
    .valid(Joi.in('$damEarTags'))
    .messages({ 'any.only': 'notOnHolding' })
}).messages({ 'any.required': REQUIRED })
