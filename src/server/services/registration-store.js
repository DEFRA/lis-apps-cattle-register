/*
 * TEMPORARY: how the stub registration client holds each registration's
 * calves in the draft store, until the cattle-register backend-for-frontend
 * (LREG-876/878...) owns them and this module is deleted.
 */
/** @import { Calf, RegistrationKey } from './registration-client.js' */

/**
 * @param {RegistrationKey} key
 * @returns {string}
 */
export function storeKey({ cph, registrationId, userId }) {
  return JSON.stringify([userId, cph, registrationId])
}

/**
 * @param {Calf} calf
 * @returns {Calf} a copy, so callers cannot change what is held
 */
export function copyCalf({
  calfDetails,
  damDetails,
  geneticDam,
  surrogateDam,
  sireDetails,
  checked
}) {
  return {
    calfDetails: { ...calfDetails },
    damDetails: { ...damDetails },
    geneticDam: { ...geneticDam },
    surrogateDam: { ...surrogateDam },
    sireDetails: { ...sireDetails },
    checked
  }
}

/**
 * @param {object} store
 * @param {RegistrationKey} key
 * @returns {Calf[]} the calves saved so far, in order
 */
export function storedCalves(store, key) {
  return store.get(storeKey(key)) ?? []
}

/**
 * @param {object} store
 * @param {RegistrationKey} key
 * @param {number} calfNumber
 * @returns {Calf | undefined}
 */
export function findStoredCalf(store, key, calfNumber) {
  return store.get(storeKey(key))?.[calfNumber - 1]
}

/**
 * Writes the calf back, which also restarts the draft's expiry.
 * @param {object} store
 * @param {RegistrationKey} key
 * @param {number} calfNumber
 * @param {Calf} calf
 */
export function saveStoredCalf(store, key, calfNumber, calf) {
  const calves = [...storedCalves(store, key)]

  calves[calfNumber - 1] = calf
  store.set(storeKey(key), calves, key.userId)
}
