import Joi from 'joi'

export const REQUIRED = 'required'

/**
 * @returns {Joi.StringSchema} an answer that may be left blank, but is there
 *   once its page has been saved
 */
export function optionalAnswer() {
  return Joi.string().trim().allow('').required()
}

/**
 * @returns {Joi.StringSchema} an answer that must be given: a blank one, or
 *   one of only spaces, counts as not given
 */
export function answer() {
  return Joi.string()
    .trim()
    .empty(Joi.string().allow('').pattern(/^\s*$/))
    .required()
}
