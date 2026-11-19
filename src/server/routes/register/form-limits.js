// The longest answer a page shows again. No answer is this long, so a longer
// one is refused like any other wrong answer, but is not sent back in the
// page.
export const MAX_ECHO_LENGTH = 256

/**
 * @param {string} value - an answer as it was posted
 * @returns {string} the answer to show again in its field: blank for one too
 *   long to show
 */
export function echoed(value) {
  return value.length > MAX_ECHO_LENGTH ? '' : value
}
