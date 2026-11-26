import { afterEach, describe, expect, test, vi } from 'vitest'

import { submissions } from '#server/services/be4fe/client.js'
import * as client from './submission.js'

vi.mock('#server/services/be4fe/client.js')

const NOT_FOUND = 404

/**
 * @param {object[]} animals - the submission's calves, as the shared client
 *   lists them
 * @returns {object} a submission as the shared client gives it
 */
function submission(animals) {
  return {
    submissionId: '7ZK-M3Q-A9D',
    status: 'DRAFT',
    createdDate: '2026-11-01T09:00:00Z',
    animals
  }
}

describe('CattleRegisterBe4FeSubmissionClient', () => {
  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('startRegistration()', () => {
    test("it starts the holding's registration", async () => {
      // Arrange
      vi.mocked(submissions.startSubmission).mockResolvedValueOnce(
        submission([])
      )

      // Act
      const result = await client.startRegistration({ cph: '10/081/0001' })

      // Assert
      expect(submissions.startSubmission).toHaveBeenCalledWith({
        cph: '10/081/0001'
      })
      expect(result).toEqual({
        submissionId: '7ZK-M3Q-A9D',
        animalId: undefined
      })
    })

    test("it continues the holding's registration with its first calf", async () => {
      // Arrange
      vi.mocked(submissions.startSubmission).mockResolvedValueOnce(
        submission([
          { animalId: 'UK123456301550', status: 'draft' },
          { animalId: 'UK123456301551', status: 'draft' }
        ])
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
      vi.mocked(submissions.getSubmission).mockResolvedValueOnce(
        submission([
          { animalId: 'UK123456301551', status: 'draft' },
          { animalId: 'UK123456301550', status: 'draft' }
        ])
      )

      // Act
      const result = await client.getSubmission({
        cph: '10/081/1234',
        submissionId: '7ZK-M3Q-A9D'
      })

      // Assert
      expect(submissions.getSubmission).toHaveBeenCalledWith({
        cph: '10/081/1234',
        submissionId: '7ZK-M3Q-A9D'
      })
      expect(result).toEqual({
        submissionId: '7ZK-M3Q-A9D',
        status: 'DRAFT',
        animals: [
          { animalId: 'UK123456301551', earTagNumber: 'UK123456301551' },
          { animalId: 'UK123456301550', earTagNumber: 'UK123456301550' }
        ]
      })
    })

    test('it passes on not found for a submission the BE4FE does not hold', async () => {
      // Arrange
      const notFound = Object.assign(new Error('Not Found'), {
        statusCode: NOT_FOUND
      })
      vi.mocked(submissions.getSubmission).mockRejectedValueOnce(notFound)

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
      expect(thrown).toBe(notFound)
    })
  })

  describe('submitRegistration()', () => {
    test('it sends the submission', async () => {
      // Arrange
      vi.mocked(submissions.submit).mockResolvedValueOnce(undefined)

      // Act
      await client.submitRegistration({
        cph: '10/081/1234',
        submissionId: '7ZK-M3Q-A9D'
      })

      // Assert
      expect(submissions.submit).toHaveBeenCalledWith({
        cph: '10/081/1234',
        submissionId: '7ZK-M3Q-A9D'
      })
    })

    test('it rethrows a failure to send', async () => {
      // Arrange
      const unavailable = Object.assign(new Error('Request failed - 503'), {
        statusCode: 503
      })
      vi.mocked(submissions.submit).mockRejectedValueOnce(unavailable)

      // Act
      let thrown
      try {
        await client.submitRegistration({
          cph: '10/081/1234',
          submissionId: '7ZK-M3Q-A9D'
        })
      } catch (error) {
        thrown = error
      }

      // Assert
      expect(thrown).toBe(unavailable)
    })
  })

  describe('SUBMITTED_STATUS', () => {
    test('it is the status of a submission that has been sent', () => {
      // Arrange / Act / Assert
      expect(client.SUBMITTED_STATUS).toBe('SUBMITTED')
    })
  })
})
