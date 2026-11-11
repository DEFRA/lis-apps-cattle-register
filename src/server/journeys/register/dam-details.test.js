import { describe, expect, test } from 'vitest'

import { registration } from './registration.js'

describe('the dam details rules', () => {
  test.each([['genetic'], ['surrogate']])(
    'it accepts a calf born via a %s dam',
    (damType) => {
      // Arrange
      const answers = { damType }

      // Act
      const result = registration.validateStep('dam-details', {}, answers)

      // Assert
      expect(result).toEqual({ errors: [], warnings: [] })
    }
  )

  test.each([
    ['none is chosen', { damType: '' }],
    ['the answer is missing', {}],
    ['the answer is not an option', { damType: 'clone' }]
  ])('it requires a dam type when %s', (_description, answers) => {
    // Arrange
    const saved = {}

    // Act
    const result = registration.validateStep('dam-details', saved, answers)

    // Assert
    expect(result.errors).toEqual([{ field: 'damType', code: 'required' }])
  })
})
