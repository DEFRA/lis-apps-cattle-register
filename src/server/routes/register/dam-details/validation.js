/*
 * The rules for the dam details page. The cattle-register
 * backend-for-frontend stores whatever it is given, so every field rule
 * lives here, beside the page, and runs before anything is saved.
 */

/**
 * @typedef {object} DamDetailsAnswers
 * @property {string} [damType] - genetic or surrogate
 */

/**
 * @typedef {object} FieldResult
 * @property {'damType'} field
 * @property {string} code
 */

export const DAM_TYPES = new Set(['genetic', 'surrogate'])

/**
 * @param {DamDetailsAnswers} answers
 * @returns {FieldResult[]}
 */
export function validateDamDetails(answers) {
  return DAM_TYPES.has(answers.damType)
    ? []
    : [{ field: 'damType', code: 'required' }]
}
