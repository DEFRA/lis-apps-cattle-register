import { describe, expect, test } from 'vitest'

import { registration } from './registration.js'

const dam = (earTagNumber) => ({
  earTagNumber,
  dateOfBirth: null,
  calfDatesOfBirth: []
})

describe('the genetic dam rules', () => {
  test("it accepts one of the holding's possible dams", () => {
    // Arrange
    const answers = { geneticDamEarTagNumber: 'UK200000000008' }

    // Act
    const result = registration.validateStep('genetic-dam', {}, answers, {
      dam: dam('UK200000000008')
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
    const options = { dam: dam('UK200000000008') }

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
    ['no dam is found', undefined],
    ['the dam found is of another ear tag number', dam('UK200000000007')]
  ])('it rejects an ear tag number when %s', (_description, found) => {
    // Arrange
    const answers = { geneticDamEarTagNumber: 'UK999999999999' }

    // Act
    const result = registration.validateStep('genetic-dam', {}, answers, {
      dam: found
    })

    // Assert
    expect(result.errors).toEqual([
      { field: 'geneticDamEarTagNumber', code: 'notOnHolding' }
    ])
  })

  test.each([
    [
      'under15Months',
      'was under 15 months old when the calf was born',
      { dateOfBirth: '2025-01-02', calfDatesOfBirth: [] }
    ],
    [
      'calvedIn240Days',
      'calved in the 240 days before the calf was born',
      { dateOfBirth: '2020-01-01', calfDatesOfBirth: ['2025-12-01'] }
    ],
    [
      'twoCalvesIn240Days',
      'calved twice in the 240 days before the calf was born',
      {
        dateOfBirth: '2020-01-01',
        calfDatesOfBirth: ['2025-08-05', '2025-12-01']
      }
    ]
  ])('it rejects, as %s, a dam that %s', (code, _description, found) => {
    // Arrange
    const saved = { dateOfBirth: '1/4/2026' }
    const answers = { geneticDamEarTagNumber: 'UK200000000009' }
    const options = {
      dam: { earTagNumber: 'UK200000000009', ...found }
    }

    // Act
    const result = registration.validateStep(
      'genetic-dam',
      saved,
      answers,
      options
    )

    // Assert
    expect(result.errors).toEqual([{ field: 'geneticDamEarTagNumber', code }])
  })

  test('it accepts a value that differs from the dam found only by spaces and case', () => {
    // Arrange
    const saved = { dateOfBirth: '1/4/2026' }
    const answers = { geneticDamEarTagNumber: ' uk2000 00000007 ' }
    const options = { dam: dam('UK200000000007') }

    // Act
    const result = registration.validateStep(
      'genetic-dam',
      saved,
      answers,
      options
    )

    // Assert
    expect(result.errors).toEqual([])
  })
})
