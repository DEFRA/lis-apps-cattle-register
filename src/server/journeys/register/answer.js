import Joi from 'joi'

import { plainEarTag } from '#server/common/helpers/ear-tag.js'

export const REQUIRED = 'required'
export const TOO_LONG = 'tooLong'

// The longest an ear tag number may be, not counting the spaces it is typed
// with
export const MAX_EAR_TAG_LENGTH = 15
// The longest it may be as typed: a space after each of its characters
const MAX_TYPED_EAR_TAG_LENGTH = 30
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
 * @param {string} typed - an ear tag number as typed
 * @returns {boolean} true for one too long to be an ear tag number, however
 *   it is spaced
 */
export function isTooLongEarTagNumber(typed) {
  return (
    plainEarTag(typed).length > MAX_EAR_TAG_LENGTH ||
    typed.length > MAX_TYPED_EAR_TAG_LENGTH
  )
}

/**
 * A Joi rule for the length of an ear tag number.
 * @param {string} value
 * @param {Joi.CustomHelpers} helpers
 * @returns {string | Joi.ErrorReport} the value, for one that is not too
 *   long
 */
function notTooLong(value, helpers) {
  return isTooLongEarTagNumber(value) ? helpers.message(TOO_LONG) : value
}

/**
 * @returns {Joi.StringSchema} an ear tag number that may be left empty and
 *   is taken as typed, not looked up: anything, up to the length of an ear
 *   tag number, however it is spaced
 */
export function optionalEarTagNumber() {
  return Joi.string().trim().custom(notTooLong).allow(null).required()
}

/**
 * @param {Joi.CustomValidator<string>} whichAnimal - a Joi rule for which
 *   animal's ear tag number it may be
 * @returns {Joi.StringSchema} an ear tag number that must be given. One too
 *   long is refused for its length alone, without asking which animal it
 *   is.
 */
export function earTagNumber(whichAnimal) {
  return answer().custom((value, helpers) =>
    isTooLongEarTagNumber(value)
      ? helpers.message(TOO_LONG)
      : whichAnimal(value, helpers)
  )
}
