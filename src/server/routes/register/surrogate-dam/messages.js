import { createGetMessage } from '../form-errors.js'

const MESSAGES = {
  geneticDamEarTagNumber: {
    required: 'Enter the animal ear tag number of the genetic dam'
  },
  surrogateDamEarTagNumber: {
    required: 'Enter the animal ear tag number of the surrogate dam'
  }
}

export const getMessage = createGetMessage(MESSAGES)
