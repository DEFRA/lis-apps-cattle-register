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

describe('registrationClient (stub) genetic dam', () => {
  test('saveGeneticDam() saves the genetic dam ear tag number', async () => {
    // Arrange
    const client = await clientWithDamType('genetic')

    // Act
    const result = await client.saveGeneticDam({
      ...registration,
      calfNumber: 1,
      answers: { earTagNumber: 'UK123456501100' }
    })

    // Assert
    expect(result).toEqual({ errors: [] })
    const calf = await client.getCalf({ ...registration, calfNumber: 1 })
    expect(calf.geneticDam).toEqual({ earTagNumber: 'UK123456501100' })
  })

  test('saveGeneticDam() saves the ear tag number trimmed', async () => {
    // Arrange
    const client = await clientWithDamType('genetic')

    // Act
    await client.saveGeneticDam({
      ...registration,
      calfNumber: 1,
      answers: { earTagNumber: '  UK123456501100 ' }
    })

    // Assert
    const calf = await client.getCalf({ ...registration, calfNumber: 1 })
    expect(calf.geneticDam).toEqual({ earTagNumber: 'UK123456501100' })
  })

  test.each([
    ['blank', ''],
    ['whitespace only', '   '],
    ['missing', undefined]
  ])(
    'saveGeneticDam() reports a %s ear tag number as required and saves nothing',
    async (_description, earTagNumber) => {
      // Arrange
      const client = await clientWithDamType('genetic')

      // Act
      const result = await client.saveGeneticDam({
        ...registration,
        calfNumber: 1,
        answers: { earTagNumber }
      })

      // Assert
      expect(result).toEqual({
        errors: [{ field: 'earTagNumber', code: 'required' }]
      })
      const calf = await client.getCalf({ ...registration, calfNumber: 1 })
      expect(calf.geneticDam).toEqual({})
    }
  )

  test('saveGeneticDam() returns null and saves nothing for a calf the registration does not have', async () => {
    // Arrange
    const client = createRegistrationClient({ now: () => NOW })

    // Act
    const result = await client.saveGeneticDam({
      ...registration,
      calfNumber: 1,
      answers: { earTagNumber: 'UK123456501100' }
    })

    // Assert
    expect(result).toBeNull()
    expect(await client.getCalf({ ...registration, calfNumber: 1 })).toBeNull()
  })

  test('saveGeneticDam() returns null for a calf whose registration has expired', async () => {
    // Arrange
    let at = NOW
    const client = await clientWithDamType('genetic', () => at)
    at = new Date(NOW.getTime() + DRAFT_TTL_MS)

    // Act
    const result = await client.saveGeneticDam({
      ...registration,
      calfNumber: 1,
      answers: { earTagNumber: 'UK123456501100' }
    })

    // Assert
    expect(result).toBeNull()
  })

  test('saveGeneticDam() restarts the expiry of the registration', async () => {
    // Arrange
    let at = NOW
    const client = await clientWithDamType('genetic', () => at)
    at = new Date(NOW.getTime() + DRAFT_TTL_MS - 1)
    await client.saveGeneticDam({
      ...registration,
      calfNumber: 1,
      answers: { earTagNumber: 'UK123456501100' }
    })
    at = new Date(NOW.getTime() + DRAFT_TTL_MS + 1)

    // Act
    const calf = await client.getCalf({ ...registration, calfNumber: 1 })

    // Assert
    expect(calf).toEqual({
      calfDetails,
      damDetails: { damType: 'genetic' },
      geneticDam: { earTagNumber: 'UK123456501100' },
      surrogateDam: {}
    })
  })

  test('saveGeneticDam() throws for a calf born via a surrogate dam', async () => {
    // Arrange
    const client = await clientWithDamType('surrogate')
    let error

    // Act
    try {
      await client.saveGeneticDam({
        ...registration,
        calfNumber: 1,
        answers: { earTagNumber: 'UK123456501100' }
      })
    } catch (e) {
      error = e
    }

    // Assert
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('Calf 1 was not born via a genetic dam')
  })

  test('saveDamDetails() keeps the genetic dam when the dam type is unchanged', async () => {
    // Arrange
    const client = await clientWithDamType('genetic')
    await client.saveGeneticDam({
      ...registration,
      calfNumber: 1,
      answers: { earTagNumber: 'UK123456501100' }
    })

    // Act
    await client.saveDamDetails({
      ...registration,
      calfNumber: 1,
      answers: { damType: 'genetic' }
    })

    // Assert
    const calf = await client.getCalf({ ...registration, calfNumber: 1 })
    expect(calf.geneticDam).toEqual({ earTagNumber: 'UK123456501100' })
  })

  test('saveDamDetails() discards the genetic dam when the dam type changes to surrogate', async () => {
    // Arrange
    const client = await clientWithDamType('genetic')
    await client.saveGeneticDam({
      ...registration,
      calfNumber: 1,
      answers: { earTagNumber: 'UK123456501100' }
    })

    // Act
    await client.saveDamDetails({
      ...registration,
      calfNumber: 1,
      answers: { damType: 'surrogate' }
    })

    // Assert
    const calf = await client.getCalf({ ...registration, calfNumber: 1 })
    expect(calf.damDetails).toEqual({ damType: 'surrogate' })
    expect(calf.geneticDam).toEqual({})
  })

  test('saveDamDetails() keeps the genetic dam when the new answer has errors', async () => {
    // Arrange
    const client = await clientWithDamType('genetic')
    await client.saveGeneticDam({
      ...registration,
      calfNumber: 1,
      answers: { earTagNumber: 'UK123456501100' }
    })

    // Act
    await client.saveDamDetails({
      ...registration,
      calfNumber: 1,
      answers: { damType: '' }
    })

    // Assert
    const calf = await client.getCalf({ ...registration, calfNumber: 1 })
    expect(calf.damDetails).toEqual({ damType: 'genetic' })
    expect(calf.geneticDam).toEqual({ earTagNumber: 'UK123456501100' })
  })

  test('getCalf() returns a copy of the genetic dam that cannot change the saved answer', async () => {
    // Arrange
    const client = await clientWithDamType('genetic')
    await client.saveGeneticDam({
      ...registration,
      calfNumber: 1,
      answers: { earTagNumber: 'UK123456501100' }
    })
    const first = await client.getCalf({ ...registration, calfNumber: 1 })
    first.geneticDam.earTagNumber = 'UK999999999999'

    // Act
    const second = await client.getCalf({ ...registration, calfNumber: 1 })

    // Assert
    expect(second.geneticDam).toEqual({ earTagNumber: 'UK123456501100' })
  })
})
