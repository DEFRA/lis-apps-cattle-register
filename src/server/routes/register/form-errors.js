/**
 * @typedef {object} FieldResult
 * @property {string} field
 * @property {string} code
 */

/**
 * A lookup of the text shown to the user for a validation result from the
 * registration service. The lookup throws on an unknown field or code so a
 * new rule cannot reach the page without wording.
 * @param {Record<string, Record<string, string>>} messages - text by field, then code
 * @returns {(result: FieldResult) => string}
 */
export function createGetMessage(messages) {
  return function getMessage({ field, code }) {
    if (
      !Object.hasOwn(messages, field) ||
      !Object.hasOwn(messages[field], code)
    ) {
      throw new Error(`No message for ${field} ${code}`)
    }

    return messages[field][code]
  }
}

/**
 * @param {FieldResult[]} errors
 * @param {(result: FieldResult) => string} getMessage
 * @returns {{ errorList: { text: string, href: string }[], fieldErrors: Record<string, { text: string }> }}
 *   the error summary items and each field's error message
 */
export function formErrors(errors, getMessage) {
  return {
    errorList: errors.map((error) => ({
      text: getMessage(error),
      href: `#${error.field}`
    })),
    fieldErrors: Object.fromEntries(
      errors.map((error) => [error.field, { text: getMessage(error) }])
    )
  }
}
