/*
 * The steps a calf's registration goes through, in order. An animal is the
 * calf's answers so far. Each step's rules are in this directory, one file
 * per step.
 */
import { calfDetailsSchema } from './calf-details.js'
import { damDetailsSchema } from './dam-details.js'
import { geneticDamSchema } from './genetic-dam.js'
import { createJourney } from './journey.js'
/** @import { Step } from './journey.js' */
/** @import { DraftAnimal } from '#server/services/registration-client.js' */

/**
 * @typedef {object} Options - what the rules need beyond the animal
 * @property {string[]} unallocatedEarTags - the ear tags issued to the
 *   holding that are not on an animal, nor on another calf of the submission
 * @property {string[]} damEarTags - the ear tags of the holding's possible
 *   dams
 */

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
    // of the other, so the answer does not carry over.
    clearsOnChange: ['geneticDamEarTagNumber']
  },
  {
    page: 'genetic-dam',
    schema: geneticDamSchema,
    appliesTo: (animal) => animal.damType === 'genetic',
    context: ({ damEarTags }) => ({ damEarTags })
  }
]

export const registration = createJourney(steps)
