import { describe, expect, test } from 'vitest'

import { plainEarTag } from './ear-tag.js'

describe('plainEarTag()', () => {
  test.each([
    ['UK123456301550', 'UK123456301550'],
    ['UK 123456 301550', 'UK123456301550'],
    ['uk123456301550', 'UK123456301550'],
    [' uk\t123456  301550 ', 'UK123456301550'],
    ['', '']
  ])('it gives %j as %j', (earTagNumber, expected) => {
    // Arrange
    const typed = earTagNumber

    // Act
    const result = plainEarTag(typed)

    // Assert
    expect(result).toBe(expected)
  })
})
