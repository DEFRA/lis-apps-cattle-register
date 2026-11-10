/*
 * The rules for the genetic dam page. The cattle-register
 * backend-for-frontend stores whatever it is given, so every field rule
 * lives here, beside the page, and runs before anything is saved.
 */

/**
 * @typedef {object} GeneticDamAnswers
 * @property {string} [earTagNumber]
 */

/**
 * @typedef {object} FieldResult
 * @property {'earTagNumber'} field
 * @property {string} code
 */

/**
 * A calf born via its genetic dam was born on the holding, so its dam is one
 * of the holding's animals that can be a dam.
 * @param {GeneticDamAnswers} answers
 * @param {string[]} damEarTags - the ear tags of the holding's possible dams
 * @returns {FieldResult[]}
 */
export function validateGeneticDam(answers, damEarTags) {
  const earTagNumber = (answers.earTagNumber ?? '').trim()

  if (earTagNumber === '') {
    return [{ field: 'earTagNumber', code: 'required' }]
  }

  if (!damEarTags.includes(earTagNumber)) {
    return [{ field: 'earTagNumber', code: 'notOnHolding' }]
  }

  return []
}
