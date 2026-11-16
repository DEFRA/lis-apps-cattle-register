// The prototype words one error for this page. A tag that is not one of the
// holding's dams shows it too, until design words that case.
const MESSAGES = {
  geneticDamEarTagNumber: {
    required: 'Enter the ear tag number of the genetic dam',
    notOnHolding: 'Enter the ear tag number of the genetic dam',
    under15Months: 'The genetic dam appears to be under 15-months old',
    over20Years: 'The genetic dam appears to be over 20 years old',
    calvedIn240Days:
      'The dam appears to have given birth in the past 240 days.',
    twoCalvesIn240Days:
      'The dam appears to have given birth to two or more calves within the last 240 days.'
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
