/*
 * The steps a calf's registration goes through, in order. An animal is the
 * calf's answers so far. Each step's rules are in this directory, one file
 * per step.
 */
import { calfDetailsSchema } from './calf-details.js'
import { createJourney } from './journey.js'

/**
 * @typedef {object} Options - what the rules need beyond the animal
 * @property {string[]} unallocatedEarTags - the ear tags issued to the
 *   holding that are not on an animal, nor on another calf of the submission
 */

export const registration = createJourney([
  {
    page: 'calf-details',
    schema: calfDetailsSchema,
    // A calf keeps the ear tag it has: the unallocated ones leave it out
    context: ({ unallocatedEarTags }, saved) => ({
      availableEarTags: [...unallocatedEarTags, saved.earTagNumber]
    })
  }
])
