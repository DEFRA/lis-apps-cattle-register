/*
 * The rules for the sire details step. Both answers are optional and the
 * sire may be anywhere, so anything is taken for them, up to a length: the
 * step is complete once its page has been saved.
 */
import Joi from 'joi'

import {
  MAX_NAME_LENGTH,
  optionalAnswer,
  optionalEarTagNumber,
  REQUIRED
} from './answer.js'

/**
 * @typedef {object} SireDetailsAnswers
 * @property {string | null} [sireEarTagNumber]
 * @property {string | null} [sireName]
 */

export const sireDetailsSchema = Joi.object({
  sireEarTagNumber: optionalEarTagNumber(),
  sireName: optionalAnswer(MAX_NAME_LENGTH)
}).messages({ 'any.required': REQUIRED })
