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

const spacedAnswers = {
  earTagNumber: 'UK 123456 301550',
  dateOfBirth: '1/11/2026',
  sex: 'female',
  breed: 'AA'
}

describe('CattleRegisterBe4FeClient calf id', () => {
  afterEach(() => {
    vi.resetAllMocks()
  })

  test('it saves a calf whose ear tag number has spaces under the number without them', async () => {
    // Arrange
    service.post.mockResolvedValueOnce({ res: { statusCode: 200 } })

    // Act
    const result = await client.saveAnimal({
      submissionId: '7ZK-M3Q-A9D',
      values: spacedAnswers
    })

    // Assert
    expect(service.post).toHaveBeenCalledWith(
      'submission/7ZK-M3Q-A9D/UK123456301550',
      {
        payload: expect.objectContaining({
          data: expect.arrayContaining([
            { key: 'earTagNumber', value: 'UK 123456 301550', type: 'STRING' }
          ])
        })
      }
    )
    expect(result).toEqual({ animalId: 'UK123456301550' })
  })

  test('it saves the calf again under the same id, removing nothing', async () => {
    // Arrange
    service.post.mockResolvedValueOnce({ res: { statusCode: 200 } })

    // Act
    const result = await client.saveAnimal({
      submissionId: '7ZK-M3Q-A9D',
      animalId: 'UK123456301550',
      values: spacedAnswers
    })

    // Assert
    expect(service.post).toHaveBeenCalledWith(
      'submission/7ZK-M3Q-A9D/UK123456301550',
      expect.anything()
    )
    expect(service.delete).not.toHaveBeenCalled()
    expect(result).toEqual({ animalId: 'UK123456301550' })
  })
})
