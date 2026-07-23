import { milliseconds } from '@livestock/ui-services/duration'

const DEFAULT_CPH = '10/081/1234'
const ID_RADIX = 36

const bundles = [
  createSeedBundle({
    id: 'REG-MNBX4Q2A',
    cph: DEFAULT_CPH,
    status: 'draft',
    updatedDaysAgo: 2,
    calves: ['UK 12 3456 100001', 'UK 12 3456 100002']
  }),
  createSeedBundle({
    id: 'REG-MNBX1K8F',
    cph: DEFAULT_CPH,
    status: 'submitted',
    updatedDaysAgo: 12,
    calves: ['UK 12 3456 099981', 'UK 12 3456 099982']
  }),
  createSeedBundle({
    id: 'REG-MN9Z7P3C',
    cph: DEFAULT_CPH,
    status: 'abandoned',
    updatedDaysAgo: 25,
    calves: ['UK 12 3456 099951']
  }),
  createSeedBundle({
    id: 'REG-MN8W5J1D',
    cph: '98/765/4321',
    status: 'submitted',
    updatedDaysAgo: 31,
    calves: ['UK 98 7654 000127']
  }),
  createSeedBundle({
    id: 'REG-MN7T6R4B',
    cph: '21/456/7890',
    status: 'submitted',
    updatedDaysAgo: 13,
    calves: ['UK 21 4567 000041']
  })
]

/**
 * @param {object} auth authenticated user details
 * @param {number} historyMonths history window in months
 * @returns {object[]} accessible bundles
 */
export function listBundlesForUser(auth, historyMonths) {
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - historyMonths)

  return bundles
    .filter((bundle) => new Date(bundle.updatedAt) >= cutoff)
    .filter((bundle) => canAccessCph(auth, bundle.cph))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

/**
 * @param {string} id bundle identifier
 * @param {object} auth authenticated user details
 * @returns {object|null} accessible bundle
 */
export function getBundleForUser(id, auth) {
  const bundle = bundles.find((candidate) => candidate.id === id)
  return bundle && canAccessCph(auth, bundle.cph) ? bundle : null
}

/**
 * @param {object} auth authenticated user details
 * @param {string} [requestedCph] holding selected in the route
 * @returns {object} newly created bundle
 */
export function createBundleForUser(auth, requestedCph) {
  const cph = requestedCph ?? cphsForUser(auth)[0] ?? DEFAULT_CPH
  if (!canAccessCph(auth, cph)) {
    return null
  }
  const now = new Date().toISOString()
  const id = nextRegistrationId(new Date(now))
  const bundle = {
    id,
    cph,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    submittedAt: null,
    abandonedAt: null,
    calves: []
  }

  bundles.unshift(bundle)
  return bundle
}

function nextRegistrationId(now) {
  const code = now.getTime().toString(ID_RADIX).toUpperCase()
  return `REG-${code}`
}

/**
 * @param {string} id bundle identifier
 * @param {object} auth authenticated user details
 * @returns {object|null} updated bundle
 */
export function addDemoCalf(id, auth) {
  const bundle = getBundleForUser(id, auth)
  if (!bundle || bundle.status !== 'draft') {
    return null
  }

  if (bundle.calves.length === 0) {
    bundle.calves.push({
      id: `CALF-${Date.now().toString(ID_RADIX).toUpperCase()}`,
      tag: 'UK 12 3456 100003'
    })
  }
  bundle.updatedAt = new Date().toISOString()
  return bundle
}

/**
 * @param {string} id bundle identifier
 * @param {object} auth authenticated user details
 * @returns {object|null} submitted bundle
 */
export function submitBundle(id, auth) {
  const bundle = getBundleForUser(id, auth)
  if (!bundle || bundle.status !== 'draft') {
    return null
  }

  const now = new Date().toISOString()
  bundle.status = 'submitted'
  bundle.submittedAt = now
  bundle.updatedAt = now
  return bundle
}

/**
 * @param {object} auth authenticated user details
 * @param {string} cph holding identifier
 * @returns {boolean} whether access is allowed
 */
export function canAccessCph(auth = {}, cph) {
  if (isBackOffice(auth)) {
    return true
  }

  return (
    auth.permissions?.includes('lis-perm-front-office') &&
    cphsForUser(auth).includes(cph)
  )
}

/**
 * @param {object} auth authenticated user details
 * @returns {boolean} whether the user has unrestricted back-office access
 */
export function isBackOffice(auth = {}) {
  return (
    auth.roles?.includes('lis-role-back-office') ||
    auth.permissions?.includes('lis-perm-back-office')
  )
}

function cphsForUser(auth = {}) {
  const assigned = (auth.roleAssignments ?? [])
    .map((assignment) => assignment.cph)
    .filter(Boolean)
  const holdings = (auth.holdings ?? [])
    .flatMap((holding) => {
      if (typeof holding === 'string') {
        return [holding]
      }
      if (Array.isArray(holding.cphs)) {
        return holding.cphs.map((nestedHolding) => nestedHolding.cph)
      }
      return [holding.cph ?? holding.id]
    })
    .filter(Boolean)

  // The fallback makes the fake-data prototype navigable with the current
  // development JWT, which does not yet carry holding data.
  const cphs = [
    ...new Set([...assigned, ...holdings, auth.cph].filter(Boolean))
  ]
  return cphs.length ? cphs : [DEFAULT_CPH]
}

function createSeedBundle({ id, cph, status, updatedDaysAgo, calves }) {
  const updatedAt = new Date(
    Date.now() - updatedDaysAgo * milliseconds.oneDay
  ).toISOString()
  return {
    id,
    cph,
    status,
    createdAt: updatedAt,
    updatedAt,
    submittedAt: status === 'submitted' ? updatedAt : null,
    abandonedAt: status === 'abandoned' ? updatedAt : null,
    calves: calves.map((tag, index) => ({
      id: `${id}-CALF-${index + 1}`,
      tag
    }))
  }
}
