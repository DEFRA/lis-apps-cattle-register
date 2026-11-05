/*
 * TEMPORARY calf details rules behind the stub registration client, until
 * the cattle-register backend-for-frontend (LREG-876/878...) owns them and
 * this module is deleted.
 */

/**
 * @param {Record<string, string | undefined>} answers
 * @returns {Record<string, string | undefined>} a copy with each answer
 *   trimmed, as it is stored
 */
export function trimAnswers(answers) {
  return Object.fromEntries(
    Object.entries(answers).map(([field, answer]) => [field, answer?.trim()])
  )
}
