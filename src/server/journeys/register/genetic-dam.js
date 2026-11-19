/*
 * The rules for the genetic dam step. A calf born via its genetic dam was
 * born on the holding, so its dam is one of the holding's animals that can
 * be a dam.
 */
import Joi from 'joi'

import { earTagNumber, REQUIRED } from './answer.js'
import { DAM_MESSAGES, damThatCalved } from './dam-checks.js'

/**
 * @typedef {object} GeneticDamAnswers
 * @property {string} [geneticDamEarTagNumber]
 */

/**
 * The genetic dam. Each rule's message is the code of its error, which the
 * page words in its messages.js. Validate it with the context dam-checks.js asks for.
 */
export const geneticDamSchema = Joi.object({
  geneticDamEarTagNumber: earTagNumber(damThatCalved).messages(DAM_MESSAGES)
}).messages({ 'any.required': REQUIRED })
