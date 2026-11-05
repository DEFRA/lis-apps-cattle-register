import { randomUUID } from 'node:crypto'

import { spokeAuth } from './spoke-auth.js'

const REDIRECT = 302

export const CPH = '10/081/1234'
export const REGISTER_PATH = `/holdings/${CPH}/cattle/register`
export const CSRF_TOKEN = 'test-csrf-token'
export const csrfHeaders = {
  'sec-fetch-site': 'same-origin',
  'x-lis-csrf-token': CSRF_TOKEN
}
export const calfDetailsPayload = {
  earTagNumber: 'UK123456301550',
  dateOfBirth: '1/11/2026',
  sex: 'female',
  breed: 'Aberdeen Angus (AA)'
}
export const damPayloads = {
  'genetic-dam': { earTagNumber: 'UK123456501100' },
  'surrogate-dam': {
    geneticDamEarTagNumber: 'UK123456501101',
    surrogateDamEarTagNumber: 'UK123456601200'
  }
}
export const sireDetailsPayload = {
  sireEarTagNumber: 'UK123456701300',
  sireName: 'Big Bob'
}

/**
 * @param {'*'|string[]} cphs
 * @param {object} [options]
 * @param {string[]} [options.permissions]
 * @returns {object} a hydrated user with those permissions on those CPHs
 */
export function createUser(
  cphs,
  { permissions = ['lis-perm-cattle-register-write'] } = {}
) {
  return {
    sub: 'test-user',
    email: 'test.user@example.com',
    statements: [{ role: 'lis-role-keeper', cphs, permissions }]
  }
}

export const keeperAuth = spokeAuth(createUser([CPH]))

/**
 * @param {string} registrationId
 * @param {string} page
 * @param {number|string} [calfNumber]
 * @returns {string} the path of a page about that calf
 */
export function calfPath(registrationId, page, calfNumber = 1) {
  return `${REGISTER_PATH}/${registrationId}/calves/${calfNumber}/${page}`
}

/**
 * @param {object} server
 * @param {string} url
 * @param {object} payload
 * @param {object} [auth]
 * @returns {Promise<object>} the response to a post with a valid CSRF token
 */
export function postForm(server, url, payload, auth = keeperAuth) {
  return server.inject({
    method: 'POST',
    url,
    auth,
    headers: csrfHeaders,
    payload: { ...payload, _csrf: CSRF_TOKEN }
  })
}

/**
 * @param {string} registrationId
 * @param {object} options - see startRegistration()
 * @returns {[string, object][]} the pages to post, in order, and their answers
 */
function registrationSteps(registrationId, options) {
  const { damType, damSaved, sireDetails, calfDetails } = options
  const steps = [
    [`${REGISTER_PATH}/${registrationId}/calf-details`, calfDetails]
  ]

  if (damType) {
    steps.push([calfPath(registrationId, 'dam-details'), { damType }])
  }

  if (damType && damSaved) {
    const page = `${damType}-dam`
    steps.push([calfPath(registrationId, page), damPayloads[page]])
  }

  if (damType && damSaved && sireDetails) {
    steps.push([calfPath(registrationId, 'sire-details'), sireDetails])
  }

  return steps
}

/**
 * Starts a registration and saves calf 1's pages, in journey order, up to
 * the first one left out.
 * @param {object} server
 * @param {object} [options]
 * @param {'genetic'|'surrogate'|null} [options.damType] - null leaves dam details unanswered
 * @param {boolean} [options.damSaved] - false leaves the dam page unanswered
 * @param {object | null} [options.sireDetails] - null leaves sire details unanswered
 * @param {object} [options.calfDetails]
 * @returns {Promise<string>} the registration id
 * @throws {Error} when a page does not accept its answers
 */
export async function startRegistration(
  server,
  {
    damType = 'genetic',
    damSaved = true,
    sireDetails = sireDetailsPayload,
    calfDetails = calfDetailsPayload
  } = {}
) {
  const registrationId = randomUUID()
  const steps = registrationSteps(registrationId, {
    damType,
    damSaved,
    sireDetails,
    calfDetails
  })

  for (const [url, payload] of steps) {
    const response = await postForm(server, url, payload)

    if (response.statusCode !== REDIRECT) {
      throw new Error(`${url} answered ${response.statusCode}`)
    }
  }

  return registrationId
}
