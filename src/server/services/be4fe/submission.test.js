import { afterEach, describe, expect, test, vi } from 'vitest'

import * as client from './submission.js'

const service = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn()
}))

vi.mock('@defra/lis-hubs-infra-core', () => ({
  createServiceClient: vi.fn(() => service)
}))

const OK = 200
const NOT_FOUND = 404

/**
 * @param {object} payload
 * @returns {{ res: { statusCode: number }, payload: object }} as the service client
 *   resolves a call
 */
function response(payload) {
  return { res: { statusCode: OK }, payload }
}

/**
 * @param {number} statusCode
 * @returns {Error & { statusCode: number }} as the service client throws for
 *   a call the service answers with an error status
 */
function failure(statusCode) {
  return Object.assign(new Error(`Request failed - ${statusCode}`), {
    statusCode
  })
}

/**
 * @param {object[]} animals - the submission's calves, as the BE4FE lists
 *   them
 * @returns {object} a submission as the BE4FE answers it
 */
function submission(animals) {
  return {
    'submission-id': '7ZK-M3Q-A9D',
    'animal-count': animals.length,
    animals,
    status: 'DRAFT',
    'created-date': '2026-11-01T09:00:00Z'
  }
}

describe('CattleRegisterBe4FeSubmissionClient', () => {
  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('startRegistration()', () => {
    test("it starts the holding's registration, with the CPH as path segments", async () => {
      // Arrange
      const get = service.get.mockResolvedValueOnce(response(submission([])))

      // Act
      const result = await client.startRegistration({ cph: '10/081/0001' })

      // Assert
      expect(get).toHaveBeenCalledWith('submission/10/081/0001/start')
      expect(result).toEqual({
        submissionId: '7ZK-M3Q-A9D',
        animalId: undefined
      })
    })

    test("it continues the holding's registration with its first calf", async () => {
      // Arrange
      service.get.mockResolvedValueOnce(
        response(
          submission([
            { 'animal-id': 'UK123456301550', status: 'draft' },
            { 'animal-id': 'UK123456301551', status: 'draft' }
          ])
        )
      )

      // Act
      const result = await client.startRegistration({ cph: '10/081/0002' })

      // Assert
      expect(result).toEqual({
        submissionId: '7ZK-M3Q-A9D',
        animalId: 'UK123456301550'
      })
    })
  })

  describe('getSubmission()', () => {
    test('it gives the submission with the id and ear tag of each calf, in its order', async () => {
      // Arrange
      const get = service.get.mockResolvedValueOnce(
        response(
          submission([
            { 'animal-id': 'UK123456301551', status: 'draft' },
            { 'animal-id': 'UK123456301550', status: 'draft' }
          ])
        )
      )

      // Act
      const result = await client.getSubmission({
        cph: '10/081/1234',
        submissionId: '7ZK-M3Q-A9D'
      })

      // Assert
      expect(get).toHaveBeenCalledWith('submission/10/081/1234/7ZK-M3Q-A9D')
      expect(result).toEqual({
        submissionId: '7ZK-M3Q-A9D',
        status: 'DRAFT',
        animals: [
          { animalId: 'UK123456301551', earTagNumber: 'UK123456301551' },
          { animalId: 'UK123456301550', earTagNumber: 'UK123456301550' }
        ]
      })
    })

    test('it reaches the submission through the encoded holding', async () => {
      // Arrange
      const get = service.get.mockResolvedValueOnce(response(submission([])))

      // Act
      await client.getSubmission({
        cph: '10/08 1/1234',
        submissionId: '7ZK-M3Q-A9D'
      })

      // Assert
      expect(get).toHaveBeenCalledWith('submission/10/08%201/1234/7ZK-M3Q-A9D')
    })

    test('it answers not found for a submission the BE4FE does not hold', async () => {
      // Arrange
      service.get.mockRejectedValueOnce(failure(NOT_FOUND))

      // Act
      let thrown
      try {
        await client.getSubmission({
          cph: '10/081/1234',
          submissionId: 'AAA-AAA-AAA'
        })
      } catch (error) {
        thrown = error
      }

      // Assert
      expect(thrown.output.statusCode).toBe(NOT_FOUND)
    })
  })
})
