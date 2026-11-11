import { afterEach, describe, expect, test, vi } from 'vitest'

import { registrationClient as client } from './registration-client.js'

const OK = 200

const validAnswers = {
  earTagNumber: 'UK123456301550',
  dateOfBirth: '1/11/2026',
  sex: 'female',
  breed: 'AA'
}

/**
 * @param {object} payload
 * @returns {{ res: { statusCode: number }, payload: object }} as BaseClient
 *   resolves a call
 */
function response(payload) {
  return { res: { statusCode: OK }, payload }
}

describe('CattleRegisterBe4FeClient', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  test('it sends the configured BE4FE API key', async () => {
    // Arrange
    vi.stubEnv('CATTLE_REGISTER_API_KEY', 'test-api-key')
    vi.resetModules()

    // Act
    const { registrationClient: reloadedClient } =
      await import('./registration-client.js')

    // Assert
    expect(reloadedClient._apiKey).toBe('test-api-key')
    expect(reloadedClient._serviceName).toBe('lis-be4fe-cattle-register')
  })

  test.each([
    ['default', undefined, 5000],
    ['environment override', '12000', 12000]
  ])(
    'it passes the %s timeout to the base client',
    async (_, value, expected) => {
      // Arrange
      vi.stubEnv('CATTLE_REGISTER_API_TIMEOUT', value)
      vi.resetModules()

      // Act
      const { registrationClient: reloadedClient } =
        await import('./registration-client.js')

      // Assert
      expect(reloadedClient._timeout).toBe(expected)
    }
  )

  describe('startRegistration()', () => {
    test('it starts a registration with calf 1', async () => {
      // Arrange
      const holding = { cph: '10/081/0001' }

      // Act
      const result = await client.startRegistration(holding)

      // Assert
      expect(result.submissionId).toMatch(
        /^[0-9A-HJKMNP-TV-Z]{3}-[0-9A-HJKMNP-TV-Z]{3}-[0-9A-HJKMNP-TV-Z]{3}$/
      )
      expect(result.animalId).toBe('1')
    })

    test("it continues the holding's registration with its calf", async () => {
      // Arrange
      const holding = { cph: '10/081/0002' }
      const { submissionId } = await client.startRegistration(holding)
      await client.saveAnimal({
        submissionId,
        animalId: '2',
        values: validAnswers
      })

      // Act
      const result = await client.startRegistration(holding)

      // Assert
      expect(result).toEqual({ submissionId, animalId: '2' })
    })

    test('it keeps the registrations of two holdings apart', async () => {
      // Arrange
      const first = await client.startRegistration({ cph: '10/081/0003' })

      // Act
      const second = await client.startRegistration({ cph: '10/081/0004' })

      // Assert
      expect(second.submissionId).not.toBe(first.submissionId)
    })

    test('it starts a new registration once the last is submitted', async () => {
      // Arrange
      const holding = { cph: '10/081/0005' }
      const submitted = await client.startRegistration(holding)
      await client.submitRegistration(submitted)

      // Act
      const result = await client.startRegistration(holding)

      // Assert
      expect(result.submissionId).not.toBe(submitted.submissionId)
    })
  })

  describe('listSubmissions()', () => {
    test("it lists the holding's submissions in the order they were started", async () => {
      // Arrange
      const cph = '10/081/0006'
      const first = await client.startRegistration({ cph })
      await client.submitRegistration(first)
      const second = await client.startRegistration({ cph })

      // Act
      const result = await client.listSubmissions({ cph })

      // Assert
      expect(result).toEqual([
        { submissionId: first.submissionId, cph, status: 'SUBMITTED' },
        { submissionId: second.submissionId, cph, status: 'DRAFT' }
      ])
    })

    test('it lists nothing for a holding with no submissions', async () => {
      // Arrange
      const holding = { cph: '10/081/0007' }

      // Act
      const result = await client.listSubmissions(holding)

      // Assert
      expect(result).toEqual([])
    })
  })

  describe('getSubmission()', () => {
    test('it gives the submission with the id and ear tag of each calf, in the order added', async () => {
      // Arrange
      const cph = '10/081/0008'
      const { submissionId } = await client.startRegistration({ cph })
      await client.saveAnimal({
        submissionId,
        animalId: '1',
        values: validAnswers
      })
      await client.saveAnimal({ submissionId, animalId: '2', values: {} })

      // Act
      const result = await client.getSubmission({ submissionId })

      // Assert
      expect(result).toEqual({
        submissionId,
        cph,
        status: 'DRAFT',
        animals: [
          { animalId: '1', earTagNumber: 'UK123456301550' },
          { animalId: '2', earTagNumber: undefined }
        ]
      })
    })

    test('it answers not found for a submission that was never started', async () => {
      // Arrange
      const submission = { submissionId: 'AAA-AAA-AAA' }

      // Act
      let thrown
      try {
        await client.getSubmission(submission)
      } catch (error) {
        thrown = error
      }

      // Assert
      expect(thrown.statusCode).toBe(404)
    })
  })

  describe('getAnimal()', () => {
    test('it returns an empty calf before its first save', async () => {
      // Arrange
      const calf = await client.startRegistration({ cph: '10/081/0009' })

      // Act
      const result = await client.getAnimal(calf)

      // Assert
      expect(result).toEqual({})
    })

    test('it keeps what is saved apart from what the caller holds', async () => {
      // Arrange
      const calf = await client.startRegistration({ cph: '10/081/0010' })
      await client.saveAnimal({ ...calf, values: validAnswers })
      const held = await client.getAnimal(calf)
      held.sex = 'male'

      // Act
      const result = await client.getAnimal(calf)

      // Assert
      expect(result).toEqual(validAnswers)
    })

    test('it answers not found for a submission that was never started', async () => {
      // Arrange
      const calf = { submissionId: 'AAA-AAA-AAA', animalId: '1' }

      // Act
      let thrown
      try {
        await client.getAnimal(calf)
      } catch (error) {
        thrown = error
      }

      // Assert
      expect(thrown.statusCode).toBe(404)
    })
  })

  describe('saveAnimal()', () => {
    test('it replaces the calf, dropping the answers it is not given', async () => {
      // Arrange
      const calf = await client.startRegistration({ cph: '10/081/0011' })
      await client.saveAnimal({ ...calf, values: validAnswers })

      // Act
      await client.saveAnimal({ ...calf, values: { sex: 'male' } })

      // Assert
      expect(await client.getAnimal(calf)).toEqual({ sex: 'male' })
    })

    test('it answers not found for a submission that was never started', async () => {
      // Arrange
      const calf = { submissionId: 'AAA-AAA-AAA', animalId: '1' }

      // Act
      let thrown
      try {
        await client.saveAnimal({ ...calf, values: validAnswers })
      } catch (error) {
        thrown = error
      }

      // Assert
      expect(thrown.statusCode).toBe(404)
    })
  })

  describe('updateAnimal()', () => {
    test('it replaces the answers given and keeps the others', async () => {
      // Arrange
      const calf = await client.startRegistration({ cph: '10/081/0012' })
      await client.saveAnimal({ ...calf, values: validAnswers })

      // Act
      await client.updateAnimal({ ...calf, values: { sex: 'male' } })

      // Assert
      expect(await client.getAnimal(calf)).toEqual({
        ...validAnswers,
        sex: 'male'
      })
    })

    test('it adds a calf that has not been saved', async () => {
      // Arrange
      const calf = await client.startRegistration({ cph: '10/081/0013' })

      // Act
      await client.updateAnimal({ ...calf, values: { sex: 'male' } })

      // Assert
      expect(await client.getAnimal(calf)).toEqual({ sex: 'male' })
    })
  })

  describe('submitRegistration()', () => {
    test('it marks the submission as submitted', async () => {
      // Arrange
      const calf = await client.startRegistration({ cph: '10/081/0014' })

      // Act
      await client.submitRegistration(calf)

      // Assert
      const submission = await client.getSubmission(calf)
      expect(submission.status).toBe('SUBMITTED')
    })

    test('it answers not found for a submission that was never started', async () => {
      // Arrange
      const submission = { submissionId: 'AAA-AAA-AAA' }

      // Act
      let thrown
      try {
        await client.submitRegistration(submission)
      } catch (error) {
        thrown = error
      }

      // Assert
      expect(thrown.statusCode).toBe(404)
    })
  })

  describe('getUnallocatedEarTags()', () => {
    test("it lists the holding's unallocated ear tags, leaving out those on the submission's calves", async () => {
      // Arrange
      const cph = '10/081/0015'
      const calf = await client.startRegistration({ cph })
      await client.saveAnimal({ ...calf, values: validAnswers })
      const get = vi.spyOn(client, '_get').mockResolvedValueOnce(
        response({
          cph,
          eartags: [
            { eartag: 'UK123456301550' },
            { eartag: 'UK324537100001' },
            { eartag: 'UK324537100002' }
          ]
        })
      )

      // Act
      const result = await client.getUnallocatedEarTags({
        cph,
        submissionId: calf.submissionId
      })

      // Assert
      expect(get).toHaveBeenCalledWith(
        'data/eartags/unallocated?cph=10%2F081%2F0015'
      )
      expect(result).toEqual(['UK324537100001', 'UK324537100002'])
    })

    test('it returns no ear tags when the holding has none', async () => {
      // Arrange
      const cph = '10/081/0016'
      const { submissionId } = await client.startRegistration({ cph })
      vi.spyOn(client, '_get').mockResolvedValueOnce(
        response({ cph, eartags: [] })
      )

      // Act
      const result = await client.getUnallocatedEarTags({ cph, submissionId })

      // Assert
      expect(result).toEqual([])
    })

    test('it answers not found for a submission that was never started', async () => {
      // Arrange
      const submission = { cph: '10/081/0017', submissionId: 'AAA-AAA-AAA' }

      // Act
      let thrown
      try {
        await client.getUnallocatedEarTags(submission)
      } catch (error) {
        thrown = error
      }

      // Assert
      expect(thrown.statusCode).toBe(404)
    })
  })
})
