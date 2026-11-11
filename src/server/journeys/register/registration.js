/*
 * The steps a calf's registration goes through, in order. An animal is the
 * calf's answers so far. Each step's rules are in this directory, one file
 * per step.
 */
import { calfDetailsSchema } from './calf-details.js'
import { damDetailsSchema } from './dam-details.js'
import { createJourney } from '@defra/lis-infra-ui-services/journey'
/** @import { Step } from '@defra/lis-infra-ui-services/journey' */
/** @import { DraftAnimal } from '#server/services/registration-client.js' */

/**
 * @typedef {object} Options - what the rules need beyond the animal
 * @property {string[]} unallocatedEarTags - the ear tags issued to the
 *   holding that are not on an animal, nor on another calf of the submission
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
    schema: damDetailsSchema
  }
]

export const registration = createJourney(steps)
