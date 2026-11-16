import {
  PERMISSIONS,
  hasPermission
} from '@defra/lis-hubs-infra-access/authorization'

import { demandRegisterAccess } from './holding-access.js'

vi.mock(
  '@defra/lis-hubs-infra-access/authorization',
  async (importOriginal) => ({
    ...(await importOriginal()),
    hasPermission: vi.fn()
  })
)

const NOT_FOUND = 404

const mocks = {
  hasPermission: vi.mocked(hasPermission)
}

const user = { id: 'keeper' }
const h = { continue: Symbol('continue') }

/**
 * @param {{ cph: string }} params
 * @returns {{ params: { cph: string }, auth: { credentials: { user: { id: string } } } }}
 *   a request for a register page of the holding
 */
function requestFor(params) {
  return { params, auth: { credentials: { user } } }
}

describe('holding access', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  test.each([
    ['register write', PERMISSIONS.cattleRegisterWrite],
    ['register admin', PERMISSIONS.cattleRegisterAdmin]
  ])(
    'demandRegisterAccess lets a user with %s on the CPH continue',
    (_, granted) => {
      // Arrange
      mocks.hasPermission.mockImplementation(
        (_user, { permission }) => permission === granted
      )

      // Act
      const result = demandRegisterAccess(requestFor({ cph: '10/081/1234' }), h)

      // Assert
      expect(result).toBe(h.continue)
      expect(mocks.hasPermission).toHaveBeenCalledWith(user, {
        permission: granted,
        cph: '10/081/1234'
      })
    }
  )

  test('demandRegisterAccess answers not found to a user without register access to the CPH', () => {
    // Arrange
    mocks.hasPermission.mockReturnValue(false)

    // Act
    const result = demandRegisterAccess(requestFor({ cph: '10/081/1234' }), h)

    // Assert
    expect(result.output.statusCode).toBe(NOT_FOUND)
    expect(mocks.hasPermission).toHaveBeenCalledWith(user, {
      permission: PERMISSIONS.cattleRegisterWrite,
      cph: '10/081/1234'
    })
    expect(mocks.hasPermission).toHaveBeenCalledWith(user, {
      permission: PERMISSIONS.cattleRegisterAdmin,
      cph: '10/081/1234'
    })
  })
})
