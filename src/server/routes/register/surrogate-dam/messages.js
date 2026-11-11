// The prototype words one error for each field. A surrogate dam that is not
// one of the holding's dams shows the field's error too, until design words
// that case.
const MESSAGES = {
  geneticDamEarTagNumber: {
    required: 'Enter the ear tag number of the genetic dam'
  },
  surrogateDamEarTagNumber: {
    required: 'Enter the ear tag number of the surrogate dam',
    notOnHolding: 'Enter the ear tag number of the surrogate dam'
  }
}

/**
 * The text shown to the user for a validation result. Throws on an unknown
 * field or code so a new rule cannot reach the page without wording.
 * @param {{ field: string, code: string }} result
 * @returns {string}
 */
export function getMessage({ field, code }) {
  if (
    !Object.hasOwn(MESSAGES, field) ||
    !Object.hasOwn(MESSAGES[field], code)
  ) {
    throw new Error(`No message for ${field} ${code}`)
  }

  return MESSAGES[field][code]
}
