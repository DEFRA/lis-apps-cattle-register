import { createGetMessage } from '../form-errors.js'

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

export const getMessage = createGetMessage(MESSAGES)
