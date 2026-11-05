import { describe, expect, test } from 'vitest'

import { DRAFT_TTL_MS } from './draft-store.js'
import { createRegistrationClient } from './registration-client.js'

const NOW = new Date('2026-11-05T10:00:00Z')
const registration = {
  cph: '10/081/1234',
  registrationId: '6f1c3c1e-6a0b-4b8e-9d3f-2a1b0c9d8e7f',
  userId: 'test-user'
}
const calfDetails = {
  earTagNumber: 'UK123456301550',
  dateOfBirth: '1/11/2026',
  sex: 'female',
  breed: 'Aberdeen Angus (AA)'
}
const surrogateDam = {
  geneticDamEarTagNumber: 'UK123456501100',
  surrogateDamEarTagNumber: 'UK123456601200'
}

/**
 * @param {string} damType
 * @param {() => Date} [now]
 * @returns {Promise<object>} a client holding calf 1 born via that dam type
 */
async function clientWithDamType(damType, now = () => NOW) {
  const client = createRegistrationClient({ now })
  await client.saveCalfDetails({ ...registration, answers: calfDetails })
  await client.saveDamDetails({
    ...registration,
    calfNumber: 1,
    answers: { damType }
  })
  return client
}

describe('registrationClient (stub) surrogate dam', () => {
  test('saveSurrogateDam() saves both ear tag numbers', async () => {
    // Arrange
    const client = await clientWithDamType('surrogate')

    // Act
    const result = await client.saveSurrogateDam({
      ...registration,
      calfNumber: 1,
      answers: surrogateDam
    })

    // Assert
    expect(result).toEqual({ errors: [] })
    const calf = await client.getCalf({ ...registration, calfNumber: 1 })
    expect(calf).toEqual({
      calfDetails,
      damDetails: { damType: 'surrogate' },
      geneticDam: {},
      surrogateDam
    })
  })

  test('saveSurrogateDam() saves both ear tag numbers trimmed', async () => {
    // Arrange
    const client = await clientWithDamType('surrogate')

    // Act
    await client.saveSurrogateDam({
      ...registration,
      calfNumber: 1,
      answers: {
        geneticDamEarTagNumber: '  UK123456501100 ',
        surrogateDamEarTagNumber: ' UK123456601200  '
      }
    })

    // Assert
    const calf = await client.getCalf({ ...registration, calfNumber: 1 })
    expect(calf.surrogateDam).toEqual(surrogateDam)
  })

  test.each([
    ['blank', ''],
    ['whitespace only', '   '],
    ['missing', undefined]
  ])(
    'saveSurrogateDam() reports %s ear tag numbers as required, in page order, and saves nothing',
    async (_description, earTagNumber) => {
      // Arrange
      const client = await clientWithDamType('surrogate')

      // Act
      const result = await client.saveSurrogateDam({
        ...registration,
        calfNumber: 1,
        answers: {
          geneticDamEarTagNumber: earTagNumber,
          surrogateDamEarTagNumber: earTagNumber
        }
      })

      // Assert
      expect(result).toEqual({
        errors: [
          { field: 'geneticDamEarTagNumber', code: 'required' },
          { field: 'surrogateDamEarTagNumber', code: 'required' }
        ]
      })
      const calf = await client.getCalf({ ...registration, calfNumber: 1 })
      expect(calf.surrogateDam).toEqual({})
    }
  )

  test.each([
    ['geneticDamEarTagNumber', { ...surrogateDam, geneticDamEarTagNumber: '' }],
    [
      'surrogateDamEarTagNumber',
      { ...surrogateDam, surrogateDamEarTagNumber: '' }
    ]
  ])('saveSurrogateDam() reports only a blank %s', async (field, answers) => {
    // Arrange
    const client = await clientWithDamType('surrogate')

    // Act
    const result = await client.saveSurrogateDam({
      ...registration,
      calfNumber: 1,
      answers
    })

    // Assert
    expect(result).toEqual({ errors: [{ field, code: 'required' }] })
  })

  test('saveSurrogateDam() returns null and saves nothing for a calf the registration does not have', async () => {
    // Arrange
    const client = createRegistrationClient({ now: () => NOW })

    // Act
    const result = await client.saveSurrogateDam({
      ...registration,
      calfNumber: 1,
      answers: surrogateDam
    })

    // Assert
    expect(result).toBeNull()
    expect(await client.getCalf({ ...registration, calfNumber: 1 })).toBeNull()
  })

  test('saveSurrogateDam() returns null for a calf whose registration has expired', async () => {
    // Arrange
    let at = NOW
    const client = await clientWithDamType('surrogate', () => at)
    at = new Date(NOW.getTime() + DRAFT_TTL_MS)

    // Act
    const result = await client.saveSurrogateDam({
      ...registration,
      calfNumber: 1,
      answers: surrogateDam
    })

    // Assert
    expect(result).toBeNull()
  })

  test('saveSurrogateDam() throws for a calf born via a genetic dam', async () => {
    // Arrange
    const client = await clientWithDamType('genetic')
    let error

    // Act
    try {
      await client.saveSurrogateDam({
        ...registration,
        calfNumber: 1,
        answers: surrogateDam
      })
    } catch (e) {
      error = e
    }

    // Assert
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('Calf 1 was not born via a surrogate dam')
  })

  test('saveDamDetails() keeps the surrogate dam when the dam type is unchanged', async () => {
    // Arrange
    const client = await clientWithDamType('surrogate')
    await client.saveSurrogateDam({
      ...registration,
      calfNumber: 1,
      answers: surrogateDam
    })

    // Act
    await client.saveDamDetails({
      ...registration,
      calfNumber: 1,
      answers: { damType: 'surrogate' }
    })

    // Assert
    const calf = await client.getCalf({ ...registration, calfNumber: 1 })
    expect(calf.surrogateDam).toEqual(surrogateDam)
  })

  test('saveDamDetails() discards the surrogate dam when the dam type changes to genetic', async () => {
    // Arrange
    const client = await clientWithDamType('surrogate')
    await client.saveSurrogateDam({
      ...registration,
      calfNumber: 1,
      answers: surrogateDam
    })

    // Act
    await client.saveDamDetails({
      ...registration,
      calfNumber: 1,
      answers: { damType: 'genetic' }
    })

    // Assert
    const calf = await client.getCalf({ ...registration, calfNumber: 1 })
    expect(calf.damDetails).toEqual({ damType: 'genetic' })
    expect(calf.surrogateDam).toEqual({})
  })

  test('saveCalfDetails() keeps the surrogate dam when calf details is changed', async () => {
    // Arrange
    const client = await clientWithDamType('surrogate')
    await client.saveSurrogateDam({
      ...registration,
      calfNumber: 1,
      answers: surrogateDam
    })

    // Act
    await client.saveCalfDetails({
      ...registration,
      answers: { ...calfDetails, sex: 'male' }
    })

    // Assert
    const calf = await client.getCalf({ ...registration, calfNumber: 1 })
    expect(calf.surrogateDam).toEqual(surrogateDam)
  })

  test('getCalf() returns a copy of the surrogate dam that cannot change the saved answers', async () => {
    // Arrange
    const client = await clientWithDamType('surrogate')
    await client.saveSurrogateDam({
      ...registration,
      calfNumber: 1,
      answers: surrogateDam
    })
    const first = await client.getCalf({ ...registration, calfNumber: 1 })
    first.surrogateDam.surrogateDamEarTagNumber = 'UK999999999999'

    // Act
    const second = await client.getCalf({ ...registration, calfNumber: 1 })

    // Assert
    expect(second.surrogateDam).toEqual(surrogateDam)
  })
})
