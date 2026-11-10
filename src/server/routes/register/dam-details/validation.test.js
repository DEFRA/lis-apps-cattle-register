import { describe, expect, test } from 'vitest'

import { validateDamDetails } from './validation.js'

describe('validateDamDetails()', () => {
  test('it accepts a calf born via a genetic dam', () => {
    // Arrange
    const answers = { damType: 'genetic' }

    // Act
    const result = validateDamDetails(answers)

    // Assert
    expect(result).toEqual([])
  })

  test('it accepts a calf born via a surrogate dam', () => {
    // Arrange
    const answers = { damType: 'surrogate' }

    // Act
    const result = validateDamDetails(answers)

    // Assert
    expect(result).toEqual([])
  })

  test('it requires a dam type when none is chosen', () => {
    // Arrange
    const answers = { damType: '' }

    // Act
    const result = validateDamDetails(answers)

    // Assert
    expect(result).toEqual([{ field: 'damType', code: 'required' }])
  })

  test('it requires a dam type when the answer is not one of the two', () => {
    // Arrange
    const answers = { damType: 'clone' }

    // Act
    const result = validateDamDetails(answers)

    // Assert
    expect(result).toEqual([{ field: 'damType', code: 'required' }])
  })

  test('it requires a dam type when the answer is missing', () => {
    // Arrange
    const answers = {}

    // Act
    const result = validateDamDetails(answers)

    // Assert
    expect(result).toEqual([{ field: 'damType', code: 'required' }])
  })
})
