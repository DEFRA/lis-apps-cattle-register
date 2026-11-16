import { afterEach, describe, expect, test, vi } from 'vitest'

import { createServiceClient } from '@defra/lis-hubs-infra-core'

import * as client from './registration-client.js'

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
const CONFLICT = 409

const validAnswers = {
  earTagNumber: 'UK123456301550',
  dateOfBirth: '1/11/2026',
  sex: 'female',
  breed: 'AA'
}

const validItems = [
  { key: 'earTagNumber', value: 'UK123456301550', type: 'STRING' },
  { key: 'dateOfBirth', value: '2026-11-01', type: 'DATE' },
  { key: 'sex', value: 'female', type: 'STRING' },
  { key: 'breed', value: 'AA', type: 'STRING' }
]

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

describe('CattleRegisterBe4FeClient', () => {
  afterEach(() => {
    vi.resetAllMocks()
    vi.unstubAllEnvs()
  })

  test('it sends the configured BE4FE API key', async () => {
    // Arrange
    vi.stubEnv('CATTLE_REGISTER_API_KEY', 'test-api-key')
    vi.resetModules()

    // Act
    vi.mocked(createServiceClient).mockReturnValue(service)
    await import('./registration-client.js')

    // Assert
    expect(vi.mocked(createServiceClient)).toHaveBeenLastCalledWith(
      expect.objectContaining({
        apiKey: 'test-api-key',
        serviceName: 'lis-be4fe-cattle-register'
      })
    )
  })

  test.each([
    ['default', undefined, 5000],
    ['environment override', '12000', 12000]
  ])(
    'it passes the %s timeout to the service client',
    async (_, value, expected) => {
      // Arrange
      vi.stubEnv('CATTLE_REGISTER_API_TIMEOUT', value)
      vi.resetModules()

      // Act
      vi.mocked(createServiceClient).mockReturnValue(service)
      await import('./registration-client.js')

      // Assert
      expect(vi.mocked(createServiceClient)).toHaveBeenLastCalledWith(
        expect.objectContaining({ timeout: expected })
      )
    }
  )

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

  describe('getAnimal()', () => {
    test("it reads the calf's answers from its data items", async () => {
      // Arrange
      const get = service.get.mockResolvedValueOnce(
        response({
          'animal-id': 'UK123456301550',
          status: 'draft',
          data: validItems
        })
      )

      // Act
      const result = await client.getAnimal({
        cph: '10/081/1234',
        submissionId: '7ZK-M3Q-A9D',
        animalId: 'UK123456301550'
      })

      // Assert
      expect(get).toHaveBeenCalledWith(
        'submission/10/081/1234/7ZK-M3Q-A9D/UK123456301550'
      )
      expect(result).toEqual(validAnswers)
    })

    test('it gives a date the BE4FE holds in another form as it is', async () => {
      // Arrange
      service.get.mockResolvedValueOnce(
        response({
          'animal-id': 'UK123456301550',
          status: 'draft',
          data: [{ key: 'dateOfBirth', value: 'last week', type: 'DATE' }]
        })
      )

      // Act
      const result = await client.getAnimal({
        cph: '10/081/1234',
        submissionId: '7ZK-M3Q-A9D',
        animalId: 'UK123456301550'
      })

      // Assert
      expect(result).toEqual({ dateOfBirth: 'last week' })
    })

    test('it reads an answer given as nothing as null', async () => {
      // Arrange
      service.get.mockResolvedValueOnce(
        response({
          'animal-id': 'UK123456301550',
          status: 'draft',
          data: [
            ...validItems,
            { key: 'sireEarTagNumber', value: null, type: 'STRING' }
          ]
        })
      )

      // Act
      const result = await client.getAnimal({
        cph: '10/081/1234',
        submissionId: '7ZK-M3Q-A9D',
        animalId: 'UK123456301550'
      })

      // Assert
      expect(result).toEqual({ ...validAnswers, sireEarTagNumber: null })
    })

    test('it rejects with not found for a calf the BE4FE does not hold', async () => {
      // Arrange
      service.get.mockRejectedValueOnce(failure(NOT_FOUND))

      // Act
      let thrown
      try {
        await client.getAnimal({
          cph: '10/081/1234',
          submissionId: '7ZK-M3Q-A9D',
          animalId: 'UK123456301550'
        })
      } catch (error) {
        thrown = error
      }

      // Assert
      expect(thrown.output.statusCode).toBe(NOT_FOUND)
    })

    test('it passes on any other failure', async () => {
      // Arrange
      service.get.mockRejectedValueOnce(failure(CONFLICT))

      // Act
      let thrown
      try {
        await client.getAnimal({
          cph: '10/081/1234',
          submissionId: '7ZK-M3Q-A9D',
          animalId: 'UK123456301550'
        })
      } catch (error) {
        thrown = error
      }

      // Assert
      expect(thrown.statusCode).toBe(CONFLICT)
    })
  })

  describe('saveAnimal()', () => {
    test('it saves a calf with no id as a draft under its ear tag number', async () => {
      // Arrange
      service.post.mockResolvedValueOnce(response(null))

      // Act
      const result = await client.saveAnimal({
        cph: '10/081/1234',
        submissionId: '7ZK-M3Q-A9D',
        values: validAnswers
      })

      // Assert
      expect(service.post).toHaveBeenCalledWith(
        'submission/10/081/1234/7ZK-M3Q-A9D/UK123456301550',
        { payload: { status: 'draft', data: validItems } }
      )
      expect(service.delete).not.toHaveBeenCalled()
      expect(result).toEqual({ animalId: 'UK123456301550' })
    })

    test('it replaces a calf saved with the same ear tag number', async () => {
      // Arrange
      service.post.mockResolvedValueOnce(response(null))

      // Act
      const result = await client.saveAnimal({
        cph: '10/081/1234',
        submissionId: '7ZK-M3Q-A9D',
        animalId: 'UK123456301550',
        values: { ...validAnswers, damType: 'genetic' }
      })

      // Assert
      expect(service.post).toHaveBeenCalledWith(
        'submission/10/081/1234/7ZK-M3Q-A9D/UK123456301550',
        {
          payload: {
            status: 'draft',
            data: [
              ...validItems,
              { key: 'damType', value: 'genetic', type: 'STRING' }
            ]
          }
        }
      )
      expect(service.delete).not.toHaveBeenCalled()
      expect(result).toEqual({ animalId: 'UK123456301550' })
    })

    test('it saves a calf given another ear tag number under that, then removes the old one', async () => {
      // Arrange
      const calls = []
      service.post.mockImplementationOnce(async (path) => {
        calls.push(`POST ${path}`)
        return response(null)
      })
      service.delete.mockImplementationOnce(async (path) => {
        calls.push(`DELETE ${path}`)
        return response(null)
      })

      // Act
      const result = await client.saveAnimal({
        cph: '10/081/1234',
        submissionId: '7ZK-M3Q-A9D',
        animalId: 'UK123456301551',
        values: validAnswers
      })

      // Assert
      expect(calls).toEqual([
        'POST submission/10/081/1234/7ZK-M3Q-A9D/UK123456301550',
        'DELETE submission/10/081/1234/7ZK-M3Q-A9D/UK123456301551'
      ])
      expect(result).toEqual({ animalId: 'UK123456301550' })
    })

    test('it does not remove the old id when the save fails', async () => {
      // Arrange
      service.post.mockRejectedValueOnce(failure(CONFLICT))

      // Act
      let thrown
      try {
        await client.saveAnimal({
          cph: '10/081/1234',
          submissionId: '7ZK-M3Q-A9D',
          animalId: 'UK123456301551',
          values: validAnswers
        })
      } catch (error) {
        thrown = error
      }

      // Assert
      expect(thrown.statusCode).toBe(CONFLICT)
      expect(service.delete).not.toHaveBeenCalled()
    })

    test('it sends a date as an ISO date', async () => {
      // Arrange
      service.post.mockResolvedValueOnce(response(null))

      // Act
      await client.saveAnimal({
        cph: '10/081/1234',
        submissionId: '7ZK-M3Q-A9D',
        animalId: 'UK123456301550',
        values: { earTagNumber: 'UK123456301550', dateOfBirth: '29/2/2028' }
      })

      // Assert
      expect(service.post).toHaveBeenCalledWith(
        'submission/10/081/1234/7ZK-M3Q-A9D/UK123456301550',
        {
          payload: {
            status: 'draft',
            data: [
              { key: 'earTagNumber', value: 'UK123456301550', type: 'STRING' },
              { key: 'dateOfBirth', value: '2028-02-29', type: 'DATE' }
            ]
          }
        }
      )
    })

    test('it leaves out an absent answer', async () => {
      // Arrange
      service.post.mockResolvedValueOnce(response(null))

      // Act
      await client.saveAnimal({
        cph: '10/081/1234',
        submissionId: '7ZK-M3Q-A9D',
        animalId: 'UK123456301550',
        values: { earTagNumber: 'UK123456301550', damType: undefined }
      })

      // Assert
      expect(service.post).toHaveBeenCalledWith(
        'submission/10/081/1234/7ZK-M3Q-A9D/UK123456301550',
        {
          payload: {
            status: 'draft',
            data: [
              { key: 'earTagNumber', value: 'UK123456301550', type: 'STRING' }
            ]
          }
        }
      )
    })

    test('it sends an answer given as nothing with a null value', async () => {
      // Arrange
      service.post.mockResolvedValueOnce(response(null))

      // Act
      await client.saveAnimal({
        cph: '10/081/1234',
        submissionId: '7ZK-M3Q-A9D',
        animalId: 'UK123456301550',
        values: { ...validAnswers, sireEarTagNumber: null, sireName: null }
      })

      // Assert
      expect(service.post).toHaveBeenCalledWith(
        'submission/10/081/1234/7ZK-M3Q-A9D/UK123456301550',
        {
          payload: {
            status: 'draft',
            data: [
              ...validItems,
              { key: 'sireEarTagNumber', value: null, type: 'STRING' },
              { key: 'sireName', value: null, type: 'STRING' }
            ]
          }
        }
      )
    })
  })

  describe('removeAnimal()', () => {
    test('it takes the calf out of the submission', async () => {
      // Arrange
      service.delete.mockResolvedValueOnce(response(null))

      // Act
      await client.removeAnimal({
        cph: '10/081/1234',
        submissionId: '7ZK-M3Q-A9D',
        animalId: 'UK123456301550'
      })

      // Assert
      expect(service.delete).toHaveBeenCalledWith(
        'submission/10/081/1234/7ZK-M3Q-A9D/UK123456301550'
      )
    })

    test('it leaves a calf that is already gone as gone', async () => {
      // Arrange
      service.delete.mockRejectedValueOnce(failure(NOT_FOUND))

      // Act
      const result = await client.removeAnimal({
        cph: '10/081/1234',
        submissionId: '7ZK-M3Q-A9D',
        animalId: 'UK123456301550'
      })

      // Assert
      expect(result).toBeUndefined()
    })

    test('it passes on any other failure', async () => {
      // Arrange
      service.delete.mockRejectedValueOnce(failure(CONFLICT))

      // Act
      let thrown
      try {
        await client.removeAnimal({
          cph: '10/081/1234',
          submissionId: '7ZK-M3Q-A9D',
          animalId: 'UK123456301550'
        })
      } catch (error) {
        thrown = error
      }

      // Assert
      expect(thrown.statusCode).toBe(CONFLICT)
    })
  })
})
