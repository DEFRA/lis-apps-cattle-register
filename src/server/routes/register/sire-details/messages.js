const MESSAGES = {
  sireEarTagNumber: {
    tooLong: 'Sire ear tag number must be 15 characters or fewer'
  },
  sireName: {
    tooLong: 'Sire name must be 200 characters or fewer'
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
