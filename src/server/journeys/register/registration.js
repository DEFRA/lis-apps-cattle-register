/*
 * The steps a calf's registration goes through, in order. An animal is the
 * calf's answers so far. Each step's rules are in this directory, one file
 * per step.
 */
import { calfDetailsSchema } from './calf-details.js'
import { damDetailsSchema } from './dam-details.js'
import { geneticDamSchema } from './genetic-dam.js'
import { sireDetailsSchema } from './sire-details.js'
import { surrogateDamSchema } from './surrogate-dam.js'
import { createJourney } from '@defra/lis-infra-ui-services/journey'
/** @import { Step } from '@defra/lis-infra-ui-services/journey' */
/** @import { DraftAnimal } from '#server/services/be4fe/animal.js' */
/** @import { Dam } from '#server/services/be4fe/data.js' */

/**
 * @typedef {object} Options - what the rules need beyond the animal
 * @property {string[]} unallocatedEarTags - the ear tags issued to the
 *   holding that are not on an animal, nor on another calf of the submission
 * @property {Dam} [dam] - the holding's animal the calf's dam is; absent
 *   when the BE4FE finds none, or finds a male
 */

/**
 * @param {Options} options
 * @returns {{ dam?: Dam }} what the rules for the cow that calved are
 *   judged against
 */
function damContext({ dam }) {
  return { dam }
}

/** @type {Step<DraftAnimal, Options>[]} */
const steps = [
  {
    page: 'calf-details',
    schema: calfDetailsSchema,
    // A calf keeps the ear tag it has: the unallocated ones leave it out
    context: ({ unallocatedEarTags }, saved) => ({
      availableEarTags: [...unallocatedEarTags, saved.earTagNumber]
    })
  },
  {
    page: 'dam-details',
    schema: damDetailsSchema,
    // The cow that calved is the genetic dam of one birth and the surrogate
    // of the other, so neither answer carries over.
    clearsOnChange: ['geneticDamEarTagNumber', 'surrogateDamEarTagNumber']
  },
  {
    page: 'genetic-dam',
    schema: geneticDamSchema,
    appliesTo: (animal) => animal.damType === 'genetic',
    context: damContext
  },
  {
    page: 'surrogate-dam',
    schema: surrogateDamSchema,
    appliesTo: (animal) => animal.damType === 'surrogate',
    context: damContext
  },
  {
    page: 'sire-details',
    schema: sireDetailsSchema
  }
]

export const registration = createJourney(steps)
