import { milliseconds } from '@livestock/ui-services/duration'

const DEFAULT_CPH = '12/345/6789'
const ID_RADIX = 36

const bundles = [
  createSeedBundle({
    id: 'REG-2026-0042',
    cph: DEFAULT_CPH,
    status: 'draft',
    updatedDaysAgo: 2,
    calves: ['UK 12 3456 100001', 'UK 12 3456 100002']
  }),
  createSeedBundle({
    id: 'REG-2026-0038',
    cph: DEFAULT_CPH,
    status: 'submitted',
    updatedDaysAgo: 12,
    calves: ['UK 12 3456 099981', 'UK 12 3456 099982']
  }),
  createSeedBundle({
    id: 'REG-2026-0031',
    cph: DEFAULT_CPH,
    status: 'abandoned',
    updatedDaysAgo: 25,
    calves: ['UK 12 3456 099951']
  }),
  createSeedBundle({
    id: 'REG-2026-0029',
    cph: '98/765/4321',
    status: 'submitted',
    updatedDaysAgo: 31,
    calves: ['UK 98 7654 000127']
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
 * @returns {object} newly created bundle
 */
export function createBundleForUser(auth) {
  const cph = cphsForUser(auth)[0] ?? DEFAULT_CPH
  const now = new Date().toISOString()
  const id = `REG-DRAFT-${Date.now().toString(ID_RADIX).toUpperCase()}`
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
    bundle.calves.push({ tag: 'UK 12 3456 100003' })
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
  if (auth.permissions?.includes('lis-perm-back-office')) {
    return true
  }

  return (
    auth.permissions?.includes('lis-perm-front-office') &&
    cphsForUser(auth).includes(cph)
  )
}

function cphsForUser(auth = {}) {
  const assigned = (auth.roleAssignments ?? [])
    .map((assignment) => assignment.cph)
    .filter(Boolean)
  const holdings = (auth.holdings ?? [])
    .map((holding) => holding.cph ?? holding.id)
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
    calves: calves.map((tag) => ({ tag }))
  }
}
