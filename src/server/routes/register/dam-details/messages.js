import { createGetMessage } from '../form-errors.js'

const MESSAGES = {
  damType: {
    required: 'Select if the calf was born via a genetic or surrogate dam'
  }
}

export const getMessage = createGetMessage(MESSAGES)
