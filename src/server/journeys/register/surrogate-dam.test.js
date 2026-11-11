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

  test('it requires both ear tag numbers, in the order of the page', () => {
    // Arrange
    const answers = {
      geneticDamEarTagNumber: '',
      surrogateDamEarTagNumber: '  '
    }

    // Act
    const result = registration.validateStep('surrogate-dam', {}, answers, {
      damEarTags: DAMS
    })

    // Assert
    expect(result.errors).toEqual([
      { field: 'geneticDamEarTagNumber', code: 'required' },
      { field: 'surrogateDamEarTagNumber', code: 'required' }
    ])
  })

  test('it requires the genetic dam alone when the surrogate is given', () => {
    // Arrange
    const answers = { surrogateDamEarTagNumber: 'UK200000000007' }

    // Act
    const result = registration.validateStep('surrogate-dam', {}, answers, {
      damEarTags: DAMS
    })

    // Assert
    expect(result.errors).toEqual([
      { field: 'geneticDamEarTagNumber', code: 'required' }
    ])
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
})
