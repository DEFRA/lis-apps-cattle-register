const BREED_MESSAGE =
  'Enter the animal breed or breed code into the text box and select the correct one from the suggested options'

// The prototype's ear tag error, for an ear tag number that is not given
const EAR_TAG_MESSAGE =
  'Enter the last 6 digits of the animal ear tag number you are registering'

const MESSAGES = {
  earTagNumber: {
    required: EAR_TAG_MESSAGE,
    tooLong: 'Animal ear tag number must be 15 characters or fewer',
    notAvailable: 'Enter an ear tag number that is available on this holding'
  },
  dateOfBirth: {
    required: 'Enter the date the animal was born',
    invalid: 'Date of birth must be a real date, for example 01/05/2026',
    future: 'Date of birth must be today or in the past',
    overDeadline:
      'Date of birth is over the 27-day deadline to report a calf birth. Check the date, or select Continue to register the birth anyway.'
  },
  sex: {
    required: 'Select if the animal is male or female'
  },
  breed: {
    required: 'Enter the animal breed or breed code',
    tooLong: 'Breed must be 50 characters or fewer',
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
