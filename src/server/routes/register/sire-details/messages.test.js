import { getMessage } from './messages.js'

describe('getMessage()', () => {
  test.each([
    ['sireEarTagNumber', 'Sire ear tag number must be 15 characters or fewer'],
    ['sireName', 'Sire name must be 200 characters or fewer']
  ])('gives the text for %s tooLong', (field, expected) => {
    // Arrange
    const result = { field, code: 'tooLong' }

    // Act
    const text = getMessage(result)

    // Assert
    expect(text).toBe(expected)
  })

  test.each([
    ['an unknown code', { field: 'sireName', code: 'unknown' }],
    ['an unknown field', { field: 'unknown', code: 'tooLong' }]
  ])('throws for %s', (_description, result) => {
    // Arrange
    let error

    // Act
    try {
      getMessage(result)
    } catch (e) {
      error = e
    }

    // Assert
    expect(error.message).toBe(`No message for ${result.field} ${result.code}`)
  })
})
