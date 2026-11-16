import { afterEach, describe, expect, test, vi } from 'vitest'

import * as client from './registration-client.js'

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

describe('CattleRegisterBe4FeClient ear tags', () => {
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
})
