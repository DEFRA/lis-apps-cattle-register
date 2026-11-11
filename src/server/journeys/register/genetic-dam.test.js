import { describe, expect, test } from 'vitest'

import { registration } from './registration.js'

const DAMS = ['UK200000000007', 'UK200000000008']

describe('the genetic dam rules', () => {
  test("it accepts one of the holding's possible dams", () => {
    // Arrange
    const answers = { geneticDamEarTagNumber: 'UK200000000008' }

    // Act
    const result = registration.validateStep('genetic-dam', {}, answers, {
      damEarTags: DAMS
    })

    // Assert
    expect(result).toEqual({ errors: [], warnings: [] })
  })

  test.each([
    ['is blank', { geneticDamEarTagNumber: '' }],
    ['is only spaces', { geneticDamEarTagNumber: '  ' }],
    ['is missing', {}]
  ])('it requires the ear tag number when it %s', (_description, answers) => {
    // Arrange
    const options = { damEarTags: DAMS }

    // Act
    const result = registration.validateStep(
      'genetic-dam',
      {},
      answers,
      options
    )

    // Assert
    expect(result.errors).toEqual([
      { field: 'geneticDamEarTagNumber', code: 'required' }
    ])
  })

  test.each([
    ["is not one of the holding's dams", DAMS],
    ['is given and the holding has no dams', []]
  ])('it rejects an ear tag number that %s', (_description, damEarTags) => {
    // Arrange
    const answers = { geneticDamEarTagNumber: 'UK999999999999' }

    // Act
    const result = registration.validateStep('genetic-dam', {}, answers, {
      damEarTags
    })

    // Assert
    expect(result.errors).toEqual([
      { field: 'geneticDamEarTagNumber', code: 'notOnHolding' }
    ])
  })
})
