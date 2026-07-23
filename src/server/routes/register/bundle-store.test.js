import { describe, expect, test } from 'vitest'
import {
  addDemoCalf,
  canAccessCph,
  createBundleForUser,
  getBundleForUser,
  isBackOffice,
  listBundlesForUser,
  submitBundle
} from './bundle-store.js'

const frontOfficeAuth = {
  permissions: ['lis-perm-front-office'],
  holdings: [{ cph: '10/081/1234' }]
}
const backOfficeAuth = { permissions: ['lis-perm-back-office'] }

describe('bundle store ownership', () => {
  test('resolves CPH access from each supported authorization source', () => {
    expect(canAccessCph(frontOfficeAuth, '10/081/1234')).toBe(true)
    expect(
      canAccessCph(
        {
          permissions: ['lis-perm-front-office'],
          roleAssignments: [{ cph: '98/765/4321' }]
        },
        '98/765/4321'
      )
    ).toBe(true)
    expect(
      canAccessCph(
        { permissions: ['lis-perm-front-office'], cph: '11/222/3333' },
        '11/222/3333'
      )
    ).toBe(true)
    expect(
      canAccessCph(
        {
          permissions: ['lis-perm-front-office'],
          holdings: ['22/333/4444']
        },
        '22/333/4444'
      )
    ).toBe(true)
    expect(
      canAccessCph(
        {
          permissions: ['lis-perm-front-office'],
          holdings: [
            {
              group_name: 'My farm',
              cphs: [{ cph: '10/081/1234' }]
            }
          ]
        },
        '10/081/1234'
      )
    ).toBe(true)
    expect(canAccessCph(backOfficeAuth, '98/765/4321')).toBe(true)
    expect(
      canAccessCph({ roles: ['lis-role-back-office'] }, '21/456/7890')
    ).toBe(true)
    expect(isBackOffice({ roles: ['lis-role-back-office'] })).toBe(true)
    expect(isBackOffice(backOfficeAuth)).toBe(true)
    expect(isBackOffice(frontOfficeAuth)).toBe(false)
    expect(canAccessCph(frontOfficeAuth, '98/765/4321')).toBe(false)
  })

  test('creates and retrieves a draft only within an accessible CPH', () => {
    const bundle = createBundleForUser(frontOfficeAuth, '10/081/1234')

    expect(bundle).toMatchObject({
      id: expect.stringMatching(/^REG-[A-Z0-9]+$/),
      cph: '10/081/1234',
      status: 'draft',
      calves: []
    })
    expect(bundle.id).not.toContain('DRAFT')
    expect(getBundleForUser(bundle.id, frontOfficeAuth)).toBe(bundle)
    expect(getBundleForUser(bundle.id, backOfficeAuth)).toBe(bundle)
    expect(getBundleForUser('missing', frontOfficeAuth)).toBeNull()
    expect(createBundleForUser(frontOfficeAuth, '98/765/4321')).toBeNull()
  })

  test('lists only accessible recent bundles', () => {
    const bundles = listBundlesForUser(frontOfficeAuth, 12)

    expect(bundles.length).toBeGreaterThan(0)
    expect(bundles.every(({ cph }) => cph === '10/081/1234')).toBe(true)
    expect(
      bundles.every(
        (bundle, index) =>
          index === 0 || bundles[index - 1].updatedAt >= bundle.updatedAt
      )
    ).toBe(true)
  })

  test('adds a stable calf ID once and submits a draft bundle', () => {
    const bundle = createBundleForUser(frontOfficeAuth, '10/081/1234')

    expect(addDemoCalf(bundle.id, frontOfficeAuth)?.calves[0]).toMatchObject({
      id: expect.stringMatching(/^CALF-/),
      tag: 'UK 12 3456 100003'
    })
    addDemoCalf(bundle.id, frontOfficeAuth)
    expect(bundle.calves).toHaveLength(1)

    expect(submitBundle(bundle.id, frontOfficeAuth)).toMatchObject({
      status: 'submitted',
      submittedAt: expect.any(String)
    })
    expect(addDemoCalf(bundle.id, frontOfficeAuth)).toBeNull()
    expect(submitBundle(bundle.id, frontOfficeAuth)).toBeNull()
  })

  test('uses the development CPH fallback when authorization has no holdings', () => {
    const auth = { permissions: ['lis-perm-front-office'] }
    const bundle = createBundleForUser(auth)

    expect(bundle.cph).toBe('10/081/1234')
  })
})
