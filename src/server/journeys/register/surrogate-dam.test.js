import { describe, expect, test } from 'vitest'

import { registration } from './registration.js'

const DAMS = ['UK200000000007', 'UK200000000008']

describe('the genetic and surrogate dam rules', () => {
  test("it accepts a surrogate that is one of the holding's dams, with any genetic dam", () => {
    // Arrange
    const answers = {
      geneticDamEarTagNumber: 'UK123456501100',
      surrogateDamEarTagNumber: 'UK200000000007'
    }

    // Act
    const result = registration.validateStep('surrogate-dam', {}, answers, {
      damEarTags: DAMS
    })

    // Assert
    expect(result).toEqual({ errors: [], warnings: [] })
  })

  test('it requires the surrogate dam alone when both are left out', () => {
    // Arrange
    const answers = {
      geneticDamEarTagNumber: null,
      surrogateDamEarTagNumber: '  '
    }

    // Act
    const result = registration.validateStep('surrogate-dam', {}, answers, {})

    // Assert
    expect(result.errors).toEqual([
      { field: 'surrogateDamEarTagNumber', code: 'required' }
    ])
  })

  test('it accepts a surrogate with the genetic dam left out', () => {
    // Arrange
    const answers = {
      geneticDamEarTagNumber: null,
      surrogateDamEarTagNumber: 'UK200000000007'
    }

    // Act
    const result = registration.validateStep('surrogate-dam', {}, answers, {
      damEarTags: DAMS
    })

    // Assert
    expect(result.errors).toEqual([])
  })

  test("it rejects a surrogate that is not one of the holding's dams", () => {
    // Arrange
    const answers = {
      geneticDamEarTagNumber: 'UK123456501100',
      surrogateDamEarTagNumber: 'UK123456601200'
    }

    // Act
    const result = registration.validateStep('surrogate-dam', {}, answers, {
      damEarTags: DAMS
    })

    // Assert
    expect(result.errors).toEqual([
      { field: 'surrogateDamEarTagNumber', code: 'notOnHolding' }
    ])
  })

  test.each([
    ['the same number', 'UK200000000007'],
    ['the same number spaced and in lower case', 'uk 200000 000007']
  ])('it rejects %s in both fields', (_description, surrogate) => {
    // Arrange
    const answers = {
      geneticDamEarTagNumber: 'UK200000000007',
      surrogateDamEarTagNumber: surrogate
    }

    // Act
    const result = registration.validateStep('surrogate-dam', {}, answers, {
      damEarTags: DAMS
    })

    // Assert
    expect(result.errors).toEqual([
      { field: 'surrogateDamEarTagNumber', code: 'sameAsGeneticDam' }
    ])
  })

  test('it accepts a different valid pair', () => {
    // Arrange
    const answers = {
      geneticDamEarTagNumber: 'UK200000000007',
      surrogateDamEarTagNumber: 'UK200000000008'
    }

    // Act
    const result = registration.validateStep('surrogate-dam', {}, answers, {
      damEarTags: DAMS
    })

    // Assert
    expect(result).toEqual({ errors: [], warnings: [] })
  })
})
