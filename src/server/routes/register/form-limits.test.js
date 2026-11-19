import { echoed } from './form-limits.js'

describe('echoed()', () => {
  test('it shows again an answer of up to 256 characters', () => {
    // Arrange
    const value = 'a'.repeat(256)

    // Act
    const result = echoed(value)

    // Assert
    expect(result).toBe(value)
  })

  test('it shows a longer answer as blank', () => {
    // Arrange
    const value = 'a'.repeat(257)

    // Act
    const result = echoed(value)

    // Assert
    expect(result).toBe('')
  })
})
