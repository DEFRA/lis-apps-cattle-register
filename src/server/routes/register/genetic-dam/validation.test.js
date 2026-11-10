import { describe, expect, test } from 'vitest'

import { validateGeneticDam } from './validation.js'

const DAMS = ['UK200000000007', 'UK200000000008']

describe('validateGeneticDam()', () => {
  test("it accepts the ear tag number of one of the holding's dams", () => {
    // Arrange
    const answers = { earTagNumber: 'UK200000000007' }

    // Act
    const result = validateGeneticDam(answers, DAMS)

    // Assert
    expect(result).toEqual([])
  })

  test('it requires an ear tag number when it is blank', () => {
    // Arrange
    const answers = { earTagNumber: '' }

    // Act
    const result = validateGeneticDam(answers, DAMS)

    // Assert
    expect(result).toEqual([{ field: 'earTagNumber', code: 'required' }])
  })

  test('it requires an ear tag number when it is only spaces', () => {
    // Arrange
    const answers = { earTagNumber: '   ' }

    // Act
    const result = validateGeneticDam(answers, DAMS)

    // Assert
    expect(result).toEqual([{ field: 'earTagNumber', code: 'required' }])
  })

  test('it requires an ear tag number when it is missing', () => {
    // Arrange
    const answers = {}

    // Act
    const result = validateGeneticDam(answers, DAMS)

    // Assert
    expect(result).toEqual([{ field: 'earTagNumber', code: 'required' }])
  })

  test("it rejects an ear tag number that is not one of the holding's dams", () => {
    // Arrange
    const answers = { earTagNumber: 'UK123456501100' }

    // Act
    const result = validateGeneticDam(answers, DAMS)

    // Assert
    expect(result).toEqual([{ field: 'earTagNumber', code: 'notOnHolding' }])
  })

  test('it rejects any ear tag number when the holding has no dams', () => {
    // Arrange
    const answers = { earTagNumber: 'UK200000000007' }

    // Act
    const result = validateGeneticDam(answers, [])

    // Assert
    expect(result).toEqual([{ field: 'earTagNumber', code: 'notOnHolding' }])
  })
})
