import * as dataClient from '#server/services/be4fe/data.js'

/** @import { DraftAnimal } from '#server/services/be4fe/animal.js' */
/** @import { Dam } from '#server/services/be4fe/data.js' */

const SURROGATE = 'surrogate'

/**
 * The cow that calved is the surrogate dam of a calf born via one, and
 * otherwise its genetic dam.
 * @param {DraftAnimal} animal
 * @returns {string | null | undefined} her ear tag number, once answered
 */
export function damThatCalvedEarTag(animal) {
  return animal.damType === SURROGATE
    ? animal.surrogateDamEarTagNumber
    : animal.geneticDamEarTagNumber
}

/**
 * @param {{ cph: string, animal: DraftAnimal }} calf
 * @returns {Promise<Dam | undefined>} the cow that calved, looked up for her
 *   age and calves; undefined while the calf has none, or the holding has
 *   no such dam
 */
export async function findDamThatCalved({ cph, animal }) {
  const earTagNumber = damThatCalvedEarTag(animal)

  return earTagNumber ? dataClient.getDam({ cph, earTagNumber }) : undefined
}

/**
 * @param {{ cph: string, animals: DraftAnimal[] }} calves
 * @returns {Promise<(Dam | undefined)[]>} the cow that calved each, in the
 *   calves' order; a cow that calved more than one is looked up once
 */
export async function findDamsThatCalved({ cph, animals }) {
  /** @type {Map<string | null | undefined, Promise<Dam | undefined>>} */
  const lookups = new Map()

  for (const animal of animals) {
    const earTagNumber = damThatCalvedEarTag(animal)

    if (!lookups.has(earTagNumber)) {
      lookups.set(earTagNumber, findDamThatCalved({ cph, animal }))
    }
  }

  return Promise.all(
    animals.map((animal) => lookups.get(damThatCalvedEarTag(animal)))
  )
}
