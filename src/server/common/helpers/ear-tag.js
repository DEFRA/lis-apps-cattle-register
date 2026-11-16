/**
 * @param {string} earTagNumber - as typed, or as it is held
 * @returns {string} the number in capitals with no spaces: the form the
 *   BE4FE knows an animal by, and the one two numbers are compared in
 */
export function plainEarTag(earTagNumber) {
  return earTagNumber.toUpperCase().replaceAll(/\s/g, '')
}
