import { afterEach, describe, expect, test, vi } from 'vitest'

import * as client from './data.js'

const service = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn()
}))

vi.mock('@defra/lis-hubs-infra-core', () => ({
  createServiceClient: vi.fn(() => service)
}))

const OK = 200
const NOT_FOUND = 404

function response(payload) {
  return { res: { statusCode: OK }, payload }
}

function failure(statusCode) {
  return Object.assign(new Error(`Request failed - ${statusCode}`), {
    statusCode
  })
}

describe('CattleRegisterBe4FeDataClient', () => {
  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('getUnallocatedEarTags()', () => {
    test("it lists the holding's unallocated ear tags that the submission does not use", async () => {
      // Arrange
      const get = service.get.mockResolvedValueOnce(
        response({
          cph: '10/081/0015',
          eartags: [{ eartag: 'UK324537100001' }, { eartag: 'UK324537100002' }]
        })
      )

      // Act
      const result = await client.getUnallocatedEarTags({
        cph: '10/081/0015',
        submissionId: '7ZK-M3Q-A9D'
      })

      // Assert
      expect(get).toHaveBeenCalledWith(
        'data/10/081/0015/ear-tags/unallocated?submission-id=7ZK-M3Q-A9D'
      )
      expect(result).toEqual(['UK324537100001', 'UK324537100002'])
    })

    test('it returns no ear tags when the holding has none', async () => {
      // Arrange
      service.get.mockResolvedValueOnce(
        response({ cph: '10/081/0016', eartags: [] })
      )

      // Act
      const result = await client.getUnallocatedEarTags({
        cph: '10/081/0016',
        submissionId: '7ZK-M3Q-A9D'
      })

      // Assert
      expect(result).toEqual([])
    })

    test('it answers not found for a submission the BE4FE does not hold', async () => {
      // Arrange
      service.get.mockRejectedValueOnce(failure(NOT_FOUND))

      // Act
      let thrown
      try {
        await client.getUnallocatedEarTags({
          cph: '10/081/0017',
          submissionId: 'AAA-AAA-AAA'
        })
      } catch (error) {
        thrown = error
      }

      // Assert
      expect(thrown.output.statusCode).toBe(NOT_FOUND)
    })
  })

  describe('getUnallocatedEarTags() for another holding', () => {
    test("it answers not found for a submission the BE4FE turns away as another holding's", async () => {
      // Arrange
      service.get.mockRejectedValueOnce(failure(400))

      // Act
      let thrown
      try {
        await client.getUnallocatedEarTags({
          cph: '10/081/1234',
          submissionId: '7ZK-M3Q-A9D'
        })
      } catch (error) {
        thrown = error
      }

      // Assert
      expect(thrown.output.statusCode).toBe(NOT_FOUND)
    })
  })

  describe('getDamEarTags()', () => {
    test("it lists the ear tags of the holding's possible dams", async () => {
      // Arrange
      const get = service.get.mockResolvedValueOnce(
        response({
          cph: '10/081/1234',
          animals: [
            { eartag: 'UK200000000007', breed: 'AA', sex: 'F' },
            { eartag: 'UK200000000008', breed: 'HE', sex: 'F' }
          ]
        })
      )

      // Act
      const result = await client.getDamEarTags({ cph: '10/081/1234' })

      // Assert
      expect(get).toHaveBeenCalledWith('data/10/081/1234/ear-tags/dams')
      expect(result).toEqual(['UK200000000007', 'UK200000000008'])
    })

    test('it returns no ear tags when the holding has no possible dams', async () => {
      // Arrange
      service.get.mockResolvedValueOnce(
        response({ cph: '10/081/1234', animals: [] })
      )

      // Act
      const result = await client.getDamEarTags({ cph: '10/081/1234' })

      // Assert
      expect(result).toEqual([])
    })

    test('it answers not found for a holding the BE4FE does not know', async () => {
      // Arrange
      service.get.mockRejectedValueOnce(failure(NOT_FOUND))

      // Act
      let thrown
      try {
        await client.getDamEarTags({ cph: '10/081/9999' })
      } catch (error) {
        thrown = error
      }

      // Assert
      expect(thrown.output.statusCode).toBe(NOT_FOUND)
    })
  })

  describe('getDams()', () => {
    test("it lists the holding's possible dams, each with her date of birth and her calves'", async () => {
      // Arrange
      const get = service.get.mockResolvedValueOnce(
        response({
          cph: '10/081/1234',
          animals: [
            {
              eartag: 'uk 200000 000007',
              sex: 'Female',
              'date-of-birth': '2023-03-15',
              children: [
                { eartag: 'UK200000000101', 'date-of-birth': '2026-01-10' },
                { eartag: 'UK200000000102', 'date-of-birth': null }
              ]
            },
            { eartag: 'UK200000000008' }
          ]
        })
      )

      // Act
      const result = await client.getDams({ cph: '10/081/1234' })

      // Assert
      expect(get).toHaveBeenCalledWith('data/10/081/1234/ear-tags/dams')
      expect(result).toEqual([
        {
          earTagNumber: 'UK200000000007',
          dateOfBirth: '2023-03-15',
          calfDatesOfBirth: ['2026-01-10']
        },
        {
          earTagNumber: 'UK200000000008',
          dateOfBirth: null,
          calfDatesOfBirth: []
        }
      ])
    })

    test('it gives none for a holding with no possible dams', async () => {
      // Arrange
      service.get.mockResolvedValueOnce(response({ cph: '10/081/1234' }))

      // Act
      const result = await client.getDams({ cph: '10/081/1234' })

      // Assert
      expect(result).toEqual([])
    })
  })

  describe('getDam()', () => {
    test("it reads the animal's date of birth and her calves', asking by the ear tag number without spaces", async () => {
      // Arrange
      const get = service.get.mockResolvedValueOnce(
        response({
          eartag: 'UK200000000007',
          'date-of-birth': '2023-03-15',
          sex: 'Female',
          children: [
            { eartag: 'UK200000000101', 'date-of-birth': '2026-01-10' },
            { eartag: 'UK200000000102', 'date-of-birth': null }
          ]
        })
      )

      // Act
      const result = await client.getDam({
        cph: '10/081/1234',
        earTagNumber: 'uk 200000 000007'
      })

      // Assert
      expect(get).toHaveBeenCalledWith(
        'data/10/081/1234/animals/UK200000000007'
      )
      expect(result).toEqual({
        earTagNumber: 'UK200000000007',
        dateOfBirth: '2023-03-15',
        calfDatesOfBirth: ['2026-01-10']
      })
    })

    test('it reads an animal with no date of birth or calves', async () => {
      // Arrange
      service.get.mockResolvedValueOnce(response({ eartag: 'UK200000000008' }))

      // Act
      const result = await client.getDam({
        cph: '10/081/1234',
        earTagNumber: 'UK200000000008'
      })

      // Assert
      expect(result).toEqual({
        earTagNumber: 'UK200000000008',
        dateOfBirth: null,
        calfDatesOfBirth: []
      })
    })

    test.each(['Male', 'male'])(
      'it returns undefined for a male of sex %s',
      async (sex) => {
        // Arrange
        service.get.mockResolvedValueOnce(
          response({ eartag: 'UK200000000009', sex })
        )

        // Act
        const result = await client.getDam({
          cph: '10/081/1234',
          earTagNumber: 'UK200000000009'
        })

        // Assert
        expect(result).toBeUndefined()
      }
    )

    test('it returns an animal with no sex recorded', async () => {
      // Arrange
      service.get.mockResolvedValueOnce(
        response({ eartag: 'UK200000000008', sex: null })
      )

      // Act
      const result = await client.getDam({
        cph: '10/081/1234',
        earTagNumber: 'UK200000000008'
      })

      // Assert
      expect(result).toEqual({
        earTagNumber: 'UK200000000008',
        dateOfBirth: null,
        calfDatesOfBirth: []
      })
    })

    test("it returns undefined for an ear tag number that is not one of the holding's animals", async () => {
      // Arrange
      service.get.mockRejectedValueOnce(failure(NOT_FOUND))

      // Act
      const result = await client.getDam({
        cph: '10/081/1234',
        earTagNumber: 'UK999999999999'
      })

      // Assert
      expect(result).toBeUndefined()
    })

    test('it passes on any other failure', async () => {
      // Arrange
      const unavailable = failure(503)
      service.get.mockRejectedValueOnce(unavailable)

      // Act
      let thrown
      try {
        await client.getDam({
          cph: '10/081/1234',
          earTagNumber: 'UK200000000007'
        })
      } catch (error) {
        thrown = error
      }

      // Assert
      expect(thrown).toBe(unavailable)
    })

    test.each([['..'], ['UK123/456'], ['UK-123'], ['']])(
      'it looks nothing up for %j, which is no ear tag number',
      async (earTagNumber) => {
        // Arrange
        const cph = '10/081/1234'

        // Act
        const result = await client.getDam({ cph, earTagNumber })

        // Assert
        expect(result).toBeUndefined()
        expect(service.get).not.toHaveBeenCalled()
      }
    )

    test('it gives her ear tag number in capitals with no spaces, however the BE4FE holds it', async () => {
      // Arrange
      service.get.mockResolvedValueOnce(
        response({ eartag: 'uk 200000 000007', sex: 'Female' })
      )

      // Act
      const result = await client.getDam({
        cph: '10/081/1234',
        earTagNumber: 'UK200000000007'
      })

      // Assert
      expect(result.earTagNumber).toBe('UK200000000007')
    })
  })
})
