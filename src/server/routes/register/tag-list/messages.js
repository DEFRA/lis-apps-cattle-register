import { createGetMessage } from '../form-errors.js'
import { MAX_CALVES } from '#server/services/registration-calves.js'

const MESSAGES = {
  addAnother: {
    required: 'Select yes to add additional animals or no to continue',
    noCalves: 'Add at least one animal before continuing',
    tooMany: `You can add up to ${MAX_CALVES} animals to one registration. Select no to continue`
  },
  calves: {
    incomplete: 'Complete all required animal details before continuing'
  }
}

export const getMessage = createGetMessage(MESSAGES)
