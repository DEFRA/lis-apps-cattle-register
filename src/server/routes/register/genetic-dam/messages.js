import { createGetMessage } from '../form-errors.js'

const MESSAGES = {
  earTagNumber: {
    required: 'Enter the animal ear tag number of the genetic dam'
  }
}

export const getMessage = createGetMessage(MESSAGES)
