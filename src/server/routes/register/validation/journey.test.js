import Joi from 'joi'
import { describe, expect, test } from 'vitest'

import { createJourney, trimAnswers } from './journey.js'

const nameStep = {
  page: 'name',
  schema: Joi.object({
    name: Joi.string()
      .required()
      .valid(Joi.in('$allowedNames'))
      .messages({ 'any.required': 'required', 'any.only': 'notAllowed' })
  }),
  context: ({ allowedNames }, saved) => ({
    allowedNames: [...allowedNames, saved.name]
  })
}
const ageStep = {
  page: 'age',
  schema: Joi.object({
    age: Joi.string().required().messages({ 'any.required': 'required' })
  }),
  context: () => ({})
}
const nicknameStep = {
  page: 'nickname',
  schema: Joi.object({
    nickname: Joi.string().required().messages({ 'any.required': 'required' })
  }),
  appliesTo: (record) => record.name === 'Daisy',
  context: () => ({})
}
const renamingStep = { ...nameStep, clearsOnChange: ['nickname'] }
const OPTIONS = { allowedNames: ['Daisy'] }

describe('journey', () => {
  describe('trimAnswers()', () => {
    test('it removes the spaces around every answer', () => {
      // Arrange
      const answers = {
        earTagNumber: ' UK123456301550 ',
        dateOfBirth: '1/11/2026 ',
        sex: 'female',
        breed: '  AA'
      }

      // Act
      const result = trimAnswers(answers)

      // Assert
      expect(result).toEqual({
        earTagNumber: 'UK123456301550',
        dateOfBirth: '1/11/2026',
        sex: 'female',
        breed: 'AA'
      })
    })

    test('it leaves a blank answer blank', () => {
      // Arrange
      const answers = { earTagNumber: '   ', breed: '' }

      // Act
      const result = trimAnswers(answers)

      // Assert
      expect(result).toEqual({ earTagNumber: '', breed: '' })
    })
  })

  describe('createJourney()', () => {
    test("it validates a page's answers with the step's rules", () => {
      // Arrange
      const journey = createJourney([nameStep, ageStep])

      // Act
      const result = journey.validateStep(
        'name',
        {},
        { name: 'Buttercup' },
        OPTIONS
      )

      // Assert
      expect(result).toEqual({
        errors: [{ field: 'name', code: 'notAllowed' }],
        warnings: []
      })
    })

    test('it gives the step the record as it is saved for its context', () => {
      // Arrange
      const journey = createJourney([nameStep, ageStep])
      const saved = { name: 'Buttercup' }

      // Act
      const result = journey.validateStep(
        'name',
        saved,
        { name: 'Buttercup' },
        OPTIONS
      )

      // Assert
      expect(result).toEqual({ errors: [], warnings: [] })
    })

    test('it finds the first step in order that is incomplete', () => {
      // Arrange
      const journey = createJourney([nameStep, ageStep])

      // Act
      const result = journey.firstIncompleteStep({ name: 'Daisy' }, OPTIONS)

      // Assert
      expect(result).toBe(ageStep)
    })

    test("it replaces only the page's own answers on the record", () => {
      // Arrange
      const journey = createJourney([nameStep, ageStep])
      const saved = { name: 'Daisy', age: '2' }

      // Act
      const result = journey.withAnswers('age', saved, {
        age: '3',
        name: 'Other'
      })

      // Assert
      expect(result).toEqual({ name: 'Daisy', age: '3' })
    })

    test('it owes the page of the first earlier step with an answer missing', () => {
      // Arrange
      const journey = createJourney([nameStep, ageStep])

      // Act
      const result = journey.pageOwed('age', {})

      // Assert
      expect(result).toBe('name')
    })

    test('it owes nothing when the earlier steps are answered', () => {
      // Arrange
      const journey = createJourney([nameStep, ageStep])

      // Act
      const result = journey.pageOwed('age', { name: 'Daisy' })

      // Assert
      expect(result).toBeUndefined()
    })

    test('it owes nothing for the first step', () => {
      // Arrange
      const journey = createJourney([nameStep, ageStep])

      // Act
      const result = journey.pageOwed('name', {})

      // Assert
      expect(result).toBeUndefined()
    })

    test('it passes over a step the record does not go through', () => {
      // Arrange
      const journey = createJourney([nameStep, nicknameStep, ageStep])

      // Act
      const result = journey.firstIncompleteStep(
        { name: 'Buttercup' },
        { allowedNames: ['Buttercup'] }
      )

      // Assert
      expect(result).toBe(ageStep)
    })

    test('it owes the last step the record goes through for a page it does not', () => {
      // Arrange
      const journey = createJourney([nameStep, nicknameStep, ageStep])

      // Act
      const result = journey.pageOwed('nickname', { name: 'Buttercup' })

      // Assert
      expect(result).toBe('name')
    })

    test('it removes the answers a changed answer invalidates', () => {
      // Arrange
      const journey = createJourney([renamingStep, nicknameStep])
      const saved = { name: 'Daisy', nickname: 'Dee' }

      // Act
      const result = journey.withAnswers('name', saved, { name: 'Buttercup' })

      // Assert
      expect(result).toEqual({ name: 'Buttercup' })
    })

    test('it keeps those answers when the answer is the same', () => {
      // Arrange
      const journey = createJourney([renamingStep, nicknameStep])
      const saved = { name: 'Daisy', nickname: 'Dee' }

      // Act
      const result = journey.withAnswers('name', saved, { name: 'Daisy' })

      // Assert
      expect(result).toEqual({ name: 'Daisy', nickname: 'Dee' })
    })

    test('it gives the step the record went through before a page', () => {
      // Arrange
      const journey = createJourney([nameStep, nicknameStep, ageStep])

      // Act
      const result = journey.previousPage('age', { name: 'Buttercup' })

      // Assert
      expect(result).toBe('name')
    })

    test('it gives no step before the first', () => {
      // Arrange
      const journey = createJourney([nameStep, ageStep])

      // Act
      const result = journey.previousPage('name', {})

      // Assert
      expect(result).toBeUndefined()
    })

    test('it gives the step the record goes through after a page, passing over one it does not', () => {
      // Arrange
      const journey = createJourney([nameStep, nicknameStep, ageStep])

      // Act
      const result = journey.nextPage('name', { name: 'Buttercup' })

      // Assert
      expect(result).toBe('age')
    })

    test('it gives no step after the last', () => {
      // Arrange
      const journey = createJourney([nameStep, ageStep])

      // Act
      const result = journey.nextPage('age', { name: 'Daisy', age: '3' })

      // Assert
      expect(result).toBeUndefined()
    })

    test('it finds the first step the record goes through with an answer yet to be saved', () => {
      // Arrange
      const journey = createJourney([nameStep, nicknameStep, ageStep])

      // Act
      const result = journey.firstUnansweredPage({ name: 'Buttercup' })

      // Assert
      expect(result).toBe('age')
    })

    test('it finds no unanswered step once every step is saved', () => {
      // Arrange
      const journey = createJourney([nameStep, nicknameStep, ageStep])

      // Act
      const result = journey.firstUnansweredPage({
        name: 'Buttercup',
        age: '3'
      })

      // Assert
      expect(result).toBeUndefined()
    })

    test('it refuses a page that is not one of its steps', () => {
      // Arrange
      const journey = createJourney([nameStep])

      // Act
      let thrown
      try {
        journey.validateStep('age', {}, { age: '3' }, OPTIONS)
      } catch (error) {
        thrown = error
      }

      // Assert
      expect(thrown.message).toBe('No step for page "age"')
    })
  })
})
