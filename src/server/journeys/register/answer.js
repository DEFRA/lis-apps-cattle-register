import Joi from 'joi'

import { plainEarTag } from '#server/common/helpers/ear-tag.js'

export const REQUIRED = 'required'
export const TOO_LONG = 'tooLong'

// The longest an ear tag number may be, not counting the spaces it is typed
// with
export const MAX_EAR_TAG_LENGTH = 15
// The longest a name may be
export const MAX_NAME_LENGTH = 200

/**
 * @param {number} maxLength - the most characters it may have
 * @returns {Joi.StringSchema} an answer that may be left empty, held as
 *   null, but is there once its page has been saved; anything is taken for
 *   it, up to its length
 */
export function optionalAnswer(maxLength) {
  return Joi.string()
    .trim()
    .max(maxLength)
    .allow(null)
    .required()
    .messages({ 'string.max': TOO_LONG })
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

/**
 * @returns {Joi.StringSchema} an ear tag number that may be left empty and
 *   is taken as typed, not looked up: anything, up to the length of an ear
 *   tag number, however it is spaced
 */
export function optionalEarTagNumber() {
  return Joi.string()
    .trim()
    .custom((value, helpers) =>
      plainEarTag(value).length > MAX_EAR_TAG_LENGTH
        ? helpers.message(TOO_LONG)
        : value
    )
    .allow(null)
    .required()
}
