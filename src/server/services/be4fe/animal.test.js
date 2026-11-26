import { afterEach, describe, expect, test, vi } from 'vitest'

import { submissions } from '#server/services/be4fe/client.js'
import * as client from './animal.js'

vi.mock('#server/services/be4fe/client.js')

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
 * @param {number} statusCode
 * @returns {Error & { statusCode: number }} as the shared client throws for
 *   a call the BE4FE answers with an error status
 */
function failure(statusCode) {
  return Object.assign(new Error(`Request failed - ${statusCode}`), {
    statusCode
  })
}

const spacedAnswers = {
  earTagNumber: 'UK 123456 301550',
  dateOfBirth: '1/11/2026',
  sex: 'female',
  breed: 'AA'
}

describe('CattleRegisterBe4FeAnimalClient', () => {
  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('getAnimal()', () => {
    test("it reads the calf's answers from its data items", async () => {
      // Arrange
      vi.mocked(submissions.getAnimal).mockResolvedValueOnce({
        animalId: 'UK123456301550',
        status: 'draft',
        data: validItems
      })

      // Act
      const result = await client.getAnimal({
        cph: '10/081/1234',
        submissionId: '7ZK-M3Q-A9D',
        animalId: 'UK123456301550'
      })

      // Assert
      expect(submissions.getAnimal).toHaveBeenCalledWith({
        cph: '10/081/1234',
        submissionId: '7ZK-M3Q-A9D',
        animalId: 'UK123456301550'
      })
      expect(result).toEqual(validAnswers)
    })

    test('it gives a date the BE4FE holds in another form as it is', async () => {
      // Arrange
      vi.mocked(submissions.getAnimal).mockResolvedValueOnce({
        animalId: 'UK123456301550',
        status: 'draft',
        data: [{ key: 'dateOfBirth', value: 'last week', type: 'DATE' }]
      })

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
      vi.mocked(submissions.getAnimal).mockResolvedValueOnce({
        animalId: 'UK123456301550',
        status: 'draft',
        data: [
          ...validItems,
          { key: 'sireEarTagNumber', value: null, type: 'STRING' }
        ]
      })

      // Act
      const result = await client.getAnimal({
        cph: '10/081/1234',
        submissionId: '7ZK-M3Q-A9D',
        animalId: 'UK123456301550'
      })

      // Assert
      expect(result).toEqual({ ...validAnswers, sireEarTagNumber: null })
    })

    test('it passes on a failure', async () => {
      // Arrange
      const conflict = failure(CONFLICT)
      vi.mocked(submissions.getAnimal).mockRejectedValueOnce(conflict)

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
      expect(thrown).toBe(conflict)
    })
  })

  describe('saveAnimal()', () => {
    test('it saves a calf with no id as a draft under its ear tag number', async () => {
      // Arrange
      vi.mocked(submissions.saveAnimal).mockResolvedValueOnce(undefined)

      // Act
      const result = await client.saveAnimal({
        cph: '10/081/1234',
        submissionId: '7ZK-M3Q-A9D',
        values: validAnswers
      })

      // Assert
      expect(submissions.saveAnimal).toHaveBeenCalledWith({
        cph: '10/081/1234',
        submissionId: '7ZK-M3Q-A9D',
        animalId: 'UK123456301550',
        previousAnimalId: undefined,
        status: 'draft',
        data: validItems
      })
      expect(result).toEqual({ animalId: 'UK123456301550' })
    })

    test('it replaces a calf saved with the same ear tag number', async () => {
      // Arrange
      vi.mocked(submissions.saveAnimal).mockResolvedValueOnce(undefined)

      // Act
      const result = await client.saveAnimal({
        cph: '10/081/1234',
        submissionId: '7ZK-M3Q-A9D',
        animalId: 'UK123456301550',
        values: { ...validAnswers, damType: 'genetic' }
      })

      // Assert
      expect(submissions.saveAnimal).toHaveBeenCalledWith({
        cph: '10/081/1234',
        submissionId: '7ZK-M3Q-A9D',
        animalId: 'UK123456301550',
        previousAnimalId: 'UK123456301550',
        status: 'draft',
        data: [
          ...validItems,
          { key: 'damType', value: 'genetic', type: 'STRING' }
        ]
      })
      expect(result).toEqual({ animalId: 'UK123456301550' })
    })

    test('it saves a calf given another ear tag number under that, with the old id as the previous one', async () => {
      // Arrange
      vi.mocked(submissions.saveAnimal).mockResolvedValueOnce(undefined)

      // Act
      const result = await client.saveAnimal({
        cph: '10/081/1234',
        submissionId: '7ZK-M3Q-A9D',
        animalId: 'UK123456301551',
        values: validAnswers
      })

      // Assert
      expect(submissions.saveAnimal).toHaveBeenCalledWith(
        expect.objectContaining({
          animalId: 'UK123456301550',
          previousAnimalId: 'UK123456301551'
        })
      )
      expect(result).toEqual({ animalId: 'UK123456301550' })
    })

    test('it passes on a failure to save', async () => {
      // Arrange
      const conflict = failure(CONFLICT)
      vi.mocked(submissions.saveAnimal).mockRejectedValueOnce(conflict)

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
      expect(thrown).toBe(conflict)
    })

    test('it sends a date as an ISO date', async () => {
      // Arrange
      vi.mocked(submissions.saveAnimal).mockResolvedValueOnce(undefined)

      // Act
      await client.saveAnimal({
        cph: '10/081/1234',
        submissionId: '7ZK-M3Q-A9D',
        animalId: 'UK123456301550',
        values: { earTagNumber: 'UK123456301550', dateOfBirth: '29/2/2028' }
      })

      // Assert
      expect(submissions.saveAnimal).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            { key: 'earTagNumber', value: 'UK123456301550', type: 'STRING' },
            { key: 'dateOfBirth', value: '2028-02-29', type: 'DATE' }
          ]
        })
      )
    })

    test('it leaves out an absent answer', async () => {
      // Arrange
      vi.mocked(submissions.saveAnimal).mockResolvedValueOnce(undefined)

      // Act
      await client.saveAnimal({
        cph: '10/081/1234',
        submissionId: '7ZK-M3Q-A9D',
        animalId: 'UK123456301550',
        values: { earTagNumber: 'UK123456301550', damType: undefined }
      })

      // Assert
      expect(submissions.saveAnimal).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            { key: 'earTagNumber', value: 'UK123456301550', type: 'STRING' }
          ]
        })
      )
    })

    test('it sends an answer given as nothing with a null value', async () => {
      // Arrange
      vi.mocked(submissions.saveAnimal).mockResolvedValueOnce(undefined)

      // Act
      await client.saveAnimal({
        cph: '10/081/1234',
        submissionId: '7ZK-M3Q-A9D',
        animalId: 'UK123456301550',
        values: { ...validAnswers, sireEarTagNumber: null, sireName: null }
      })

      // Assert
      expect(submissions.saveAnimal).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            ...validItems,
            { key: 'sireEarTagNumber', value: null, type: 'STRING' },
            { key: 'sireName', value: null, type: 'STRING' }
          ]
        })
      )
    })
  })

  describe('removeAnimal()', () => {
    test('it takes the calf out of the submission', async () => {
      // Arrange
      vi.mocked(submissions.removeAnimal).mockResolvedValueOnce(undefined)

      // Act
      const result = await client.removeAnimal({
        cph: '10/081/1234',
        submissionId: '7ZK-M3Q-A9D',
        animalId: 'UK123456301550'
      })

      // Assert
      expect(submissions.removeAnimal).toHaveBeenCalledWith({
        cph: '10/081/1234',
        submissionId: '7ZK-M3Q-A9D',
        animalId: 'UK123456301550'
      })
      expect(result).toBeUndefined()
    })

    test('it passes on a failure', async () => {
      // Arrange
      const conflict = failure(CONFLICT)
      vi.mocked(submissions.removeAnimal).mockRejectedValueOnce(conflict)

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
      expect(thrown).toBe(conflict)
    })
  })

  describe('saveAnimal() and the id a calf is saved under', () => {
    test('it saves a calf whose ear tag number has spaces under the number without them', async () => {
      // Arrange
      vi.mocked(submissions.saveAnimal).mockResolvedValueOnce(undefined)

      // Act
      const result = await client.saveAnimal({
        cph: '10/081/1234',
        submissionId: '7ZK-M3Q-A9D',
        values: spacedAnswers
      })

      // Assert
      expect(submissions.saveAnimal).toHaveBeenCalledWith(
        expect.objectContaining({
          animalId: 'UK123456301550',
          data: expect.arrayContaining([
            { key: 'earTagNumber', value: 'UK 123456 301550', type: 'STRING' }
          ])
        })
      )
      expect(result).toEqual({ animalId: 'UK123456301550' })
    })

    test.each([[null], [undefined], ['']])(
      'it saves a calf whose answers have ear tag number %j under the id it has',
      async (earTagNumber) => {
        // Arrange
        vi.mocked(submissions.saveAnimal).mockResolvedValueOnce(undefined)

        // Act
        const result = await client.saveAnimal({
          cph: '10/081/1234',
          submissionId: '7ZK-M3Q-A9D',
          animalId: 'UK123456301550',
          values: { ...spacedAnswers, earTagNumber }
        })

        // Assert
        expect(submissions.saveAnimal).toHaveBeenCalledWith(
          expect.objectContaining({
            animalId: 'UK123456301550',
            previousAnimalId: 'UK123456301550'
          })
        )
        expect(result).toEqual({ animalId: 'UK123456301550' })
      }
    )

    test('it saves a calf whose ear tag number is in lower case under the number in capitals', async () => {
      // Arrange
      vi.mocked(submissions.saveAnimal).mockResolvedValueOnce(undefined)

      // Act
      const result = await client.saveAnimal({
        cph: '10/081/1234',
        submissionId: '7ZK-M3Q-A9D',
        values: { ...spacedAnswers, earTagNumber: 'uk 123456 301550' }
      })

      // Assert
      expect(result).toEqual({ animalId: 'UK123456301550' })
    })
  })
})
