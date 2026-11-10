import { afterEach, describe, expect, test, vi } from 'vitest'

import { registrationClient as client } from './registration-client.js'

const CPH = '10/081/1234'
const SUBMISSION_ID = '7ZK-M3Q-A9D'
const ANIMAL_ID = '2'
const CALF = { submissionId: SUBMISSION_ID, animalId: ANIMAL_ID }
const SECTION_PATH = `submission/${SUBMISSION_ID}/${ANIMAL_ID}/CALF-DETAILS`
const START_PATH = 'submission/start?cph=10%2F081%2F1234'
const UPDATE_PATH = `submission/${SUBMISSION_ID}:update`
const OK = 200

const validAnswers = {
  earTagNumber: 'UK123456301550',
  dateOfBirth: '1/11/2026',
  sex: 'female',
  breed: 'Aberdeen Angus (AA)'
}

/**
 * @param {object} payload
 * @returns {{ res: { statusCode: number }, payload: object }} as BaseClient
 *   resolves a call
 */
function response(payload) {
  return { res: { statusCode: OK }, payload }
}

/**
 * @param {string[]} animalIds
 * @returns {object} the BE4FE's answer to starting the holding's submission
 */
function submission(animalIds) {
  return {
    'submission-id': SUBMISSION_ID,
    'created-date': '2026-11-05T10:00:00+00:00',
    animals: animalIds.map((id) => ({ 'animal-id': id, status: 'DRAFT' }))
  }
}

describe('CattleRegisterBe4FeClient', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  test('it sends the configured BE4FE API key', async () => {
    // Arrange
    vi.stubEnv('CATTLE_REGISTER_API_KEY', 'test-api-key')
    vi.resetModules()

    // Act
    const { registrationClient: reloadedClient } =
      await import('./registration-client.js')

    // Assert
    expect(reloadedClient._apiKey).toBe('test-api-key')
    expect(reloadedClient._serviceName).toBe('lis-be4fe-cattle-register')
  })

  test.each([
    ['default', undefined, 5000],
    ['environment override', '12000', 12000]
  ])(
    'it passes the %s timeout to the base client',
    async (_, value, expected) => {
      // Arrange
      vi.stubEnv('CATTLE_REGISTER_API_TIMEOUT', value)
      vi.resetModules()

      // Act
      const { registrationClient: reloadedClient } =
        await import('./registration-client.js')

      // Assert
      expect(reloadedClient._timeout).toBe(expected)
    }
  )

  describe('startRegistration()', () => {
    test("it continues the holding's registration with its calf", async () => {
      // Arrange
      const get = vi
        .spyOn(client, '_get')
        .mockResolvedValueOnce(response(submission([ANIMAL_ID])))

      // Act
      const result = await client.startRegistration({ cph: CPH })

      // Assert
      expect(get).toHaveBeenCalledWith(START_PATH)
      expect(result).toEqual(CALF)
    })

    test('it starts a registration with calf 1', async () => {
      // Arrange
      vi.spyOn(client, '_get').mockResolvedValueOnce(response(submission([])))

      // Act
      const result = await client.startRegistration({ cph: CPH })

      // Assert
      expect(result).toEqual({ submissionId: SUBMISSION_ID, animalId: '1' })
    })
  })

  describe('getUnallocatedEarTags()', () => {
    test("it lists the holding's unallocated ear tags, excluding the submission's", async () => {
      // Arrange
      const get = vi.spyOn(client, '_get').mockResolvedValueOnce(
        response({
          cph: CPH,
          eartags: [{ eartag: 'UK324537100001' }, { eartag: 'UK324537100002' }]
        })
      )

      // Act
      const result = await client.getUnallocatedEarTags({
        cph: CPH,
        submissionId: SUBMISSION_ID
      })

      // Assert
      expect(get).toHaveBeenCalledWith(
        `data/eartags/unallocated?cph=10%2F081%2F1234&submission-id=${SUBMISSION_ID}`
      )
      expect(result).toEqual(['UK324537100001', 'UK324537100002'])
    })

    test('it returns no ear tags when the holding has none', async () => {
      // Arrange
      vi.spyOn(client, '_get').mockResolvedValueOnce(
        response({ cph: CPH, eartags: [] })
      )

      // Act
      const result = await client.getUnallocatedEarTags({
        cph: CPH,
        submissionId: SUBMISSION_ID
      })

      // Assert
      expect(result).toEqual([])
    })
  })

  describe('getCalfDetails()', () => {
    test('it returns the saved answers of the calf', async () => {
      // Arrange
      const get = vi.spyOn(client, '_get').mockResolvedValueOnce(
        response({
          'animal-id': ANIMAL_ID,
          section: 'CALF-DETAILS',
          data: [
            { key: 'earTagNumber', value: 'UK123456301550', type: 'STRING' },
            { key: 'dateOfBirth', value: '1/11/2026', type: 'STRING' },
            { key: 'sex', value: 'female', type: 'STRING' },
            { key: 'breed', value: 'Aberdeen Angus (AA)', type: 'STRING' }
          ]
        })
      )

      // Act
      const result = await client.getCalfDetails(CALF)

      // Assert
      expect(get).toHaveBeenCalledWith(SECTION_PATH)
      expect(result).toEqual(validAnswers)
    })

    test('it returns empty answers before the calf is saved', async () => {
      // Arrange
      vi.spyOn(client, '_get').mockResolvedValueOnce(
        response({ 'animal-id': ANIMAL_ID, section: 'CALF-DETAILS', data: [] })
      )

      // Act
      const result = await client.getCalfDetails(CALF)

      // Assert
      expect(result).toEqual({})
    })

    test('it rethrows a BE4FE failure, such as an unknown submission', async () => {
      // Arrange
      const failure = new Error('Request failed - 404')
      failure.statusCode = 404
      vi.spyOn(client, '_get').mockRejectedValueOnce(failure)

      // Act
      let error
      try {
        await client.getCalfDetails(CALF)
      } catch (e) {
        error = e
      }

      // Assert
      expect(error).toBe(failure)
    })
  })

  describe('saveCalfDetails()', () => {
    test("it saves the calf's answers under its animal id", async () => {
      // Arrange
      const post = vi
        .spyOn(client, '_post')
        .mockResolvedValueOnce(response(null))

      // Act
      await client.saveCalfDetails({ ...CALF, answers: validAnswers })

      // Assert
      expect(post).toHaveBeenCalledWith(UPDATE_PATH, {
        payload: {
          'animal-id': ANIMAL_ID,
          section: 'CALF-DETAILS',
          status: 'DRAFT',
          data: [
            { key: 'earTagNumber', value: 'UK123456301550', type: 'STRING' },
            { key: 'dateOfBirth', value: '1/11/2026', type: 'STRING' },
            { key: 'sex', value: 'female', type: 'STRING' },
            { key: 'breed', value: 'Aberdeen Angus (AA)', type: 'STRING' }
          ]
        }
      })
    })

    test('it rethrows a BE4FE failure', async () => {
      // Arrange
      const failure = new Error('503 - Service unavailable')
      vi.spyOn(client, '_post').mockRejectedValueOnce(failure)

      // Act
      let error
      try {
        await client.saveCalfDetails({ ...CALF, answers: validAnswers })
      } catch (e) {
        error = e
      }

      // Assert
      expect(error).toBe(failure)
    })
  })
})
