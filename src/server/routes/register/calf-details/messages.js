const BREED_MESSAGE =
  'Enter the animal breed or breed code into the text box and select the correct one from the suggested options'

const MESSAGES = {
  earTagNumber: {
    required: 'Enter the animal ear tag number'
  },
  dateOfBirth: {
    required: 'Enter the date the animal was born',
    invalid: 'Date of birth must be a real date, for example 01/05/2026',
    future: 'Date of birth must be today or in the past',
    overDeadline:
      'Date of birth is over the 27-day deadline to report a calf birth.'
  },
  sex: {
    required: 'Select if the animal is male or female'
  },
  breed: {
    required: BREED_MESSAGE,
    unknown: BREED_MESSAGE
  }
}

/**
 * The text shown to the user for a validation result from the registration
 * service. Throws on an unknown field or code so a new rule cannot reach the
 * page without wording.
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
