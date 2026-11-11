export const MAX_CALVES = 50

const MESSAGES = {
  addAnother: {
    required: 'Select yes to add additional animals or no to continue',
    tooMany: `You can add up to ${MAX_CALVES} animals to one registration. Select no to continue`
  },
  calves: {
    incomplete: 'Complete all required animal details before continuing'
  }
}

/**
 * The text shown to the user for a problem with the list of calves. Throws
 * on an unknown field or code so a new rule cannot reach the page without
 * wording.
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
