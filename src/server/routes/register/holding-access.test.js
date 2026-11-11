import {
  PERMISSIONS,
  hasPermission
} from '@defra/lis-hubs-infra-access/authorization'

import * as registrationClient from '#server/services/registration-client.js'
import {
  demandRegisterAccess,
  demandSubmissionOfHolding
} from './holding-access.js'

vi.mock(
  '@defra/lis-hubs-infra-access/authorization',
  async (importOriginal) => ({
    ...(await importOriginal()),
    hasPermission: vi.fn()
  })
)
vi.mock('#server/services/registration-client.js')

const NOT_FOUND = 404

const mocks = {
  hasPermission: vi.mocked(hasPermission),
  hasSubmission: vi.mocked(registrationClient.hasSubmission)
}

const user = { id: 'keeper' }
const h = { continue: Symbol('continue') }

/**
 * @param {{ cph: string, submissionId?: string }} params
 * @returns {{ params: { cph: string, submissionId?: string }, auth: { credentials: { user: { id: string } } } }}
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

  test("demandSubmissionOfHolding lets a request for one of the holding's submissions continue", async () => {
    // Arrange
    mocks.hasSubmission.mockResolvedValueOnce(true)

    // Act
    const result = await demandSubmissionOfHolding(
      requestFor({ cph: '10/081/1234', submissionId: '7ZK-M3Q-A9D' }),
      h
    )

    // Assert
    expect(result).toBe(h.continue)
    expect(mocks.hasSubmission).toHaveBeenCalledWith({
      cph: '10/081/1234',
      submissionId: '7ZK-M3Q-A9D'
    })
  })

  test("demandSubmissionOfHolding answers not found for another holding's, or an unknown, submission", async () => {
    // Arrange
    mocks.hasSubmission.mockResolvedValueOnce(false)

    // Act
    const result = await demandSubmissionOfHolding(
      requestFor({ cph: '10/081/1234', submissionId: 'B0B-B0B-B0B' }),
      h
    )

    // Assert
    expect(result.output.statusCode).toBe(NOT_FOUND)
  })

  test('demandSubmissionOfHolding rethrows a BE4FE failure', async () => {
    // Arrange
    const failure = new Error('503 - Service unavailable')
    mocks.hasSubmission.mockRejectedValueOnce(failure)

    // Act
    let error
    try {
      await demandSubmissionOfHolding(
        requestFor({ cph: '10/081/1234', submissionId: '7ZK-M3Q-A9D' }),
        h
      )
    } catch (e) {
      error = e
    }

    // Assert
    expect(error).toBe(failure)
  })
})
