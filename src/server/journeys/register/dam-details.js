/*
 * The rules for the dam details step: whether the calf was born via a
 * genetic or a surrogate dam.
 */
import Joi from 'joi'

import { answer, REQUIRED } from './answer.js'

/**
 * @typedef {object} DamDetailsAnswers
 * @property {string} [damType] - genetic or surrogate
 */

/**
 * The dam details. Each rule's message is the code of its error, which the
 * page words in its messages.js.
 */
export const damDetailsSchema = Joi.object({
  damType: answer()
    .valid('genetic', 'surrogate')
    .messages({ 'any.only': REQUIRED })
}).messages({ 'any.required': REQUIRED })
