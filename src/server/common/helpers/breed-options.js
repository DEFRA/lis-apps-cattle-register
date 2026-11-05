import { breeds } from '@defra/lis-species-cattle'

/**
 * Each cattle breed as the "Name (CODE)" text the breed autocomplete lists
 * and submits.
 * @type {string[]}
 */
export const breedOptions = Object.entries(breeds).map(
  ([code, name]) => `${name} (${code})`
)
