import { afterEach, describe, expect, test, vi } from 'vitest'

import { registrationClient as client } from './registration-client.js'

const CPH = '10/081/1234'
const SUBMISSION_ID = '7ZK-M3Q-A9D'
const ANIMAL_ID = '6f1c3c1e-6a0b-4b8e-9d3f-2a1b0c9d8e7f'
const START_PATH = 'submission/start?cph=10%2F081%2F1234'
const UPDATE_PATH = `submission/${SUBMISSION_ID}:update`
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
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
    test("it starts, or continues, the holding's registration", async () => {
      // Arrange
      const get = vi
        .spyOn(client, '_get')
        .mockResolvedValueOnce(response(submission([ANIMAL_ID])))

      // Act
      const result = await client.startRegistration({ cph: CPH })

      // Assert
      expect(get).toHaveBeenCalledWith(START_PATH)
      expect(result).toEqual({ submissionId: SUBMISSION_ID })
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
    test('it returns empty answers before the calf is saved', async () => {
      // Arrange
      const get = vi
        .spyOn(client, '_get')
        .mockResolvedValueOnce(response(submission([])))

      // Act
      const result = await client.getCalfDetails({
        cph: CPH,
        submissionId: SUBMISSION_ID
      })

      // Assert
      expect(result).toEqual({ answers: {} })
      expect(get).toHaveBeenCalledTimes(1)
    })

    test('it returns the saved answers of the calf', async () => {
      // Arrange
      const get = vi
        .spyOn(client, '_get')
        .mockResolvedValueOnce(response(submission([ANIMAL_ID])))
        .mockResolvedValueOnce(
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
      const result = await client.getCalfDetails({
        cph: CPH,
        submissionId: SUBMISSION_ID
      })

      // Assert
      expect(get).toHaveBeenNthCalledWith(
        2,
        `submission/${SUBMISSION_ID}/${ANIMAL_ID}/CALF-DETAILS`
      )
      expect(result).toEqual({ answers: validAnswers })
    })

    test('it reads the submission id case-insensitively', async () => {
      // Arrange
      vi.spyOn(client, '_get').mockResolvedValueOnce(response(submission([])))

      // Act
      const result = await client.getCalfDetails({
        cph: CPH,
        submissionId: SUBMISSION_ID.toLowerCase()
      })

      // Assert
      expect(result).toEqual({ answers: {} })
    })

    test("it returns null for a registration that is not the holding's", async () => {
      // Arrange
      vi.spyOn(client, '_get').mockResolvedValueOnce(
        response({ ...submission([]), 'submission-id': 'AAA-BBB-CCC' })
      )

      // Act
      const result = await client.getCalfDetails({
        cph: CPH,
        submissionId: SUBMISSION_ID
      })

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('saveCalfDetails()', () => {
    test('it adds the calf as a new animal', async () => {
      // Arrange
      vi.spyOn(client, '_get').mockResolvedValueOnce(response(submission([])))
      const post = vi
        .spyOn(client, '_post')
        .mockResolvedValueOnce(response(null))

      // Act
      const result = await client.saveCalfDetails({
        cph: CPH,
        submissionId: SUBMISSION_ID,
        answers: validAnswers
      })

      // Assert
      expect(result).toBe(true)
      expect(post).toHaveBeenCalledTimes(1)
      const [path, { payload }] = post.mock.calls[0]
      expect(path).toBe(UPDATE_PATH)
      expect(payload['animal-id']).toMatch(UUID_PATTERN)
      expect(payload).toMatchObject({
        section: 'CALF-DETAILS',
        status: 'DRAFT',
        data: [
          { key: 'earTagNumber', value: 'UK123456301550', type: 'STRING' },
          { key: 'dateOfBirth', value: '1/11/2026', type: 'STRING' },
          { key: 'sex', value: 'female', type: 'STRING' },
          { key: 'breed', value: 'Aberdeen Angus (AA)', type: 'STRING' }
        ]
      })
    })

    test("it replaces a saved calf's answers under its animal id", async () => {
      // Arrange
      vi.spyOn(client, '_get').mockResolvedValueOnce(
        response(submission([ANIMAL_ID]))
      )
      const post = vi
        .spyOn(client, '_post')
        .mockResolvedValueOnce(response(null))

      // Act
      const result = await client.saveCalfDetails({
        cph: CPH,
        submissionId: SUBMISSION_ID,
        answers: { ...validAnswers, sex: 'male' }
      })

      // Assert
      expect(result).toBe(true)
      expect(post).toHaveBeenCalledWith(UPDATE_PATH, {
        payload: {
          'animal-id': ANIMAL_ID,
          section: 'CALF-DETAILS',
          status: 'DRAFT',
          data: [
            { key: 'earTagNumber', value: 'UK123456301550', type: 'STRING' },
            { key: 'dateOfBirth', value: '1/11/2026', type: 'STRING' },
            { key: 'sex', value: 'male', type: 'STRING' },
            { key: 'breed', value: 'Aberdeen Angus (AA)', type: 'STRING' }
          ]
        }
      })
    })

    test("it saves nothing for a registration that is not the holding's", async () => {
      // Arrange
      vi.spyOn(client, '_get').mockResolvedValueOnce(
        response({ ...submission([]), 'submission-id': 'AAA-BBB-CCC' })
      )
      const post = vi.spyOn(client, '_post')

      // Act
      const result = await client.saveCalfDetails({
        cph: CPH,
        submissionId: SUBMISSION_ID,
        answers: validAnswers
      })

      // Assert
      expect(result).toBe(false)
      expect(post).not.toHaveBeenCalled()
    })

    test('it rethrows a BE4FE failure', async () => {
      // Arrange
      vi.spyOn(client, '_get').mockResolvedValueOnce(response(submission([])))
      const failure = new Error('503 - Service unavailable')
      vi.spyOn(client, '_post').mockRejectedValueOnce(failure)

      // Act
      let error
      try {
        await client.saveCalfDetails({
          cph: CPH,
          submissionId: SUBMISSION_ID,
          answers: validAnswers
        })
      } catch (e) {
        error = e
      }

      // Assert
      expect(error).toBe(failure)
    })
  })
})
