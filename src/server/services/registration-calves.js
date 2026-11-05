/*
 * TEMPORARY rules about the calves in one registration, behind the stub
 * registration client, until the cattle-register backend-for-frontend
 * (LREG-876/878...) owns them and this module is deleted.
 */

// The design sets no limit; this keeps one in-memory draft bounded.
export const MAX_CALVES = 50

/**
 * @param {unknown[]} calves - the calves saved so far, in order
 * @param {number} calfNumber - from 1
 * @returns {boolean} true for a saved calf, or the next one while the
 *   registration has room for it
 */
export function isAddressableCalf(calves, calfNumber) {
  return (
    Number.isInteger(calfNumber) &&
    calfNumber >= 1 &&
    calfNumber <= Math.min(calves.length + 1, MAX_CALVES)
  )
}

/**
 * @param {unknown[]} calves
 * @returns {boolean} true while another calf can be added
 */
export function hasRoomForCalf(calves) {
  return calves.length < MAX_CALVES
}

/**
 * Ear tags compare without spaces and case, as they are often typed.
 * @param {string} earTagNumber
 * @returns {string}
 */
function comparableEarTag(earTagNumber) {
  return earTagNumber.replaceAll(/\s/g, '').toUpperCase()
}

/**
 * @param {{ calfDetails: { earTagNumber?: string } }[]} calves
 * @param {number} calfNumber - the calf being saved, from 1
 * @param {string} earTagNumber
 * @returns {boolean} true when another calf in the registration has the tag
 */
export function isEarTagTaken(calves, calfNumber, earTagNumber) {
  const earTag = comparableEarTag(earTagNumber)

  return calves.some(
    (calf, index) =>
      index !== calfNumber - 1 &&
      comparableEarTag(calf.calfDetails.earTagNumber ?? '') === earTag
  )
}
