// The prototype words one error for this page. A tag that is not one of the
// holding's dams shows it too, until design words that case.
const MESSAGES = {
  geneticDamEarTagNumber: {
    required: 'Enter the ear tag number of the genetic dam',
    notOnHolding: 'Enter the ear tag number of the genetic dam'
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
