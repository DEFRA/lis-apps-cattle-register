import { afterEach, describe, expect, test, vi } from 'vitest'

import * as dataClient from '#server/services/be4fe/data.js'
import { findDamThatCalved, findDamsThatCalved } from './dam-that-calved.js'

vi.mock('#server/services/be4fe/data.js')

const mocks = {
  getDam: vi.mocked(dataClient.getDam)
}

const CPH = '10/081/1234'
const DAM = { earTagNumber: 'UK200000000007' }

describe('the cow that calved', () => {
  describe('findDamThatCalved()', () => {
    afterEach(() => {
      vi.clearAllMocks()
    })

    test.each([
      [
        'the genetic dam of a calf born via her',
        { damType: 'genetic', geneticDamEarTagNumber: 'UK200000000007' }
      ],
      [
        'the surrogate dam of a calf born via one',
        {
          damType: 'surrogate',
          geneticDamEarTagNumber: 'UK200000000008',
          surrogateDamEarTagNumber: 'UK200000000007'
        }
      ]
    ])('it looks up %s', async (_description, animal) => {
      // Arrange
      mocks.getDam.mockResolvedValueOnce(DAM)

      // Act
      const result = await findDamThatCalved({ cph: CPH, animal })

      // Assert
      expect(mocks.getDam).toHaveBeenCalledWith({
        cph: CPH,
        earTagNumber: 'UK200000000007'
      })
      expect(result).toBe(DAM)
    })

    test.each([
      ['has no dam yet', { damType: 'genetic' }],
      ['has not said how it was born', {}],
      [
        'has an empty dam ear tag number',
        { damType: 'genetic', geneticDamEarTagNumber: '' }
      ],
      [
        'has a null surrogate dam ear tag number',
        { damType: 'surrogate', surrogateDamEarTagNumber: null }
      ]
    ])(
      'it looks nothing up for a calf that %s',
      async (_description, animal) => {
        // Arrange
        // Act
        const result = await findDamThatCalved({ cph: CPH, animal })

        // Assert
        expect(result).toBeUndefined()
        expect(mocks.getDam).not.toHaveBeenCalled()
      }
    )
  })

  describe('findDamsThatCalved()', () => {
    afterEach(() => {
      vi.clearAllMocks()
    })

    test('it looks up a cow that calved more than one calf once, and gives her for each', async () => {
      // Arrange
      const twin = {
        damType: 'genetic',
        geneticDamEarTagNumber: 'UK200000000007'
      }
      const other = {
        damType: 'surrogate',
        geneticDamEarTagNumber: 'UK200000000007',
        surrogateDamEarTagNumber: 'UK200000000008'
      }
      const unanswered = { damType: 'genetic' }
      const second = { ...DAM, earTagNumber: 'UK200000000008' }
      mocks.getDam.mockResolvedValueOnce(DAM).mockResolvedValueOnce(second)

      // Act
      const result = await findDamsThatCalved({
        cph: CPH,
        animals: [twin, other, twin, unanswered]
      })

      // Assert
      expect(mocks.getDam).toHaveBeenCalledTimes(2)
      expect(result).toEqual([DAM, second, DAM, undefined])
    })

    test('it gives none for no calves', async () => {
      // Arrange
      const animals = []

      // Act
      const result = await findDamsThatCalved({ cph: CPH, animals })

      // Assert
      expect(result).toEqual([])
      expect(mocks.getDam).not.toHaveBeenCalled()
    })
  })
})
