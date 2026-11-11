import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { registration } from './registration.js'

const { firstIncompleteStep, steps, validateStep, withAnswers } = registration

const NOW = new Date('2026-11-10T12:00:00Z')
const TAGS = ['UK123456301550', 'UK324537100001']
const calfDetails = {
  earTagNumber: 'UK123456301550',
  dateOfBirth: '1/11/2026',
  sex: 'female',
  breed: 'AA'
}

describe('registration', () => {
  beforeEach(() => {
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('validateStep()', () => {
    test("it gives no errors or warnings for a page's valid answers", () => {
      // Arrange
      const answers = { ...calfDetails }

      // Act
      const result = validateStep('calf-details', {}, answers, {
        unallocatedEarTags: TAGS
      })

      // Assert
      expect(result).toEqual({ errors: [], warnings: [] })
    })

    test("it gives the errors of the page's own rules", () => {
      // Arrange
      const answers = { ...calfDetails, sex: '' }

      // Act
      const result = validateStep('calf-details', {}, answers, {
        unallocatedEarTags: TAGS
      })

      // Assert
      expect(result.errors).toEqual([{ field: 'sex', code: 'required' }])
    })

    test("it judges the answers in place of the calf's saved ones", () => {
      // Arrange
      const animal = { ...calfDetails, sex: '', damType: 'genetic' }
      const answers = { ...calfDetails }

      // Act
      const result = validateStep('calf-details', animal, answers, {
        unallocatedEarTags: TAGS
      })

      // Assert
      expect(result).toEqual({ errors: [], warnings: [] })
    })

    test('it judges against the present when no time is given', () => {
      // Arrange
      const answers = { ...calfDetails, dateOfBirth: '1/1/2999' }

      // Act
      const result = validateStep('calf-details', {}, answers, {
        unallocatedEarTags: TAGS
      })

      // Assert
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].field).toBe('dateOfBirth')
    })

    test('it rejects an ear tag number that is not unallocated', () => {
      // Arrange
      const answers = { ...calfDetails, earTagNumber: 'UK999999999999' }

      // Act
      const result = validateStep('calf-details', {}, answers, {
        unallocatedEarTags: TAGS
      })

      // Assert
      expect(result.errors).toEqual([
        { field: 'earTagNumber', code: 'notAvailable' }
      ])
    })

    test('it lets the calf keep the ear tag number it is saved with', () => {
      // Arrange
      const animal = { ...calfDetails }
      const answers = { ...calfDetails, sex: 'male' }

      // Act
      const result = validateStep('calf-details', animal, answers, {
        unallocatedEarTags: []
      })

      // Assert
      expect(result.errors).toEqual([])
    })

    test('it does not let the calf take an ear tag number it was not saved with', () => {
      // Arrange
      const animal = { ...calfDetails }
      const answers = { ...calfDetails, earTagNumber: 'UK324537100001' }

      // Act
      const result = validateStep('calf-details', animal, answers, {
        unallocatedEarTags: []
      })

      // Assert
      expect(result.errors).toEqual([
        { field: 'earTagNumber', code: 'notAvailable' }
      ])
    })

    test('it gives the warnings apart from the errors', () => {
      // Arrange
      const answers = { ...calfDetails }
      const fortyDaysOn = new Date('2026-12-11T12:00:00Z')
      vi.setSystemTime(fortyDaysOn)

      // Act
      const result = validateStep('calf-details', {}, answers, {
        unallocatedEarTags: TAGS
      })

      // Assert
      expect(result.errors).toEqual([])
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].field).toBe('dateOfBirth')
    })

    test('it throws for a page that is not a step', () => {
      // Arrange
      let error

      // Act
      try {
        validateStep('not-a-page', {}, calfDetails, {
          unallocatedEarTags: TAGS
        })
      } catch (e) {
        error = e
      }

      // Assert
      expect(error).toBeInstanceOf(Error)
      expect(error.message).toBe('No step for page "not-a-page"')
    })
  })

  describe('firstIncompleteStep()', () => {
    test('it is undefined for a calf with every step answered', () => {
      // Arrange
      const animal = {
        ...calfDetails,
        damType: 'genetic',
        geneticDamEarTagNumber: 'UK200000000007',
        sireEarTagNumber: '',
        sireName: ''
      }

      // Act
      const result = firstIncompleteStep(animal, {
        unallocatedEarTags: TAGS,
        damEarTags: ['UK200000000007']
      })

      // Assert
      expect(result).toBeUndefined()
    })

    test('it counts the ear tag number a saved calf has as its own', () => {
      // Arrange
      const animal = {
        ...calfDetails,
        damType: 'genetic',
        geneticDamEarTagNumber: 'UK200000000007',
        sireEarTagNumber: '',
        sireName: ''
      }

      // Act
      const result = firstIncompleteStep(animal, {
        unallocatedEarTags: [],
        damEarTags: ['UK200000000007']
      })

      // Assert
      expect(result).toBeUndefined()
    })

    test('it is sire details until that page has been saved', () => {
      // Arrange
      const animal = {
        ...calfDetails,
        damType: 'genetic',
        geneticDamEarTagNumber: 'UK200000000007'
      }

      // Act
      const result = firstIncompleteStep(animal, {
        unallocatedEarTags: TAGS,
        damEarTags: ['UK200000000007']
      })

      // Assert
      expect(result.page).toBe('sire-details')
    })

    test('it is the genetic dam for a calf born via one that is not given', () => {
      // Arrange
      const animal = { ...calfDetails, damType: 'genetic' }

      // Act
      const result = firstIncompleteStep(animal, {
        unallocatedEarTags: TAGS,
        damEarTags: ['UK200000000007']
      })

      // Assert
      expect(result.page).toBe('genetic-dam')
    })

    test('it passes over the genetic dam for a calf born via a surrogate', () => {
      // Arrange
      const animal = {
        ...calfDetails,
        damType: 'surrogate',
        geneticDamEarTagNumber: 'UK123456501100',
        surrogateDamEarTagNumber: 'UK200000000007',
        sireEarTagNumber: '',
        sireName: ''
      }

      // Act
      const result = firstIncompleteStep(animal, {
        unallocatedEarTags: TAGS,
        damEarTags: ['UK200000000007']
      })

      // Assert
      expect(result).toBeUndefined()
    })

    test('it is the surrogate dam for a calf born via one that is not given', () => {
      // Arrange
      const animal = { ...calfDetails, damType: 'surrogate' }

      // Act
      const result = firstIncompleteStep(animal, {
        unallocatedEarTags: TAGS,
        damEarTags: ['UK200000000007']
      })

      // Assert
      expect(result.page).toBe('surrogate-dam')
    })

    test('it is dam details for a calf with only its own details', () => {
      // Arrange
      const animal = { ...calfDetails }

      // Act
      const result = firstIncompleteStep(animal, { unallocatedEarTags: TAGS })

      // Assert
      expect(result.page).toBe('dam-details')
    })

    test('it is calf details for a calf with no answers', () => {
      // Arrange
      const animal = {}

      // Act
      const result = firstIncompleteStep(animal, {
        unallocatedEarTags: TAGS
      })

      // Assert
      expect(result).toBe(steps[0])
      expect(result.page).toBe('calf-details')
    })

    test('it is calf details when one of its answers is wrong', () => {
      // Arrange
      const animal = { ...calfDetails, breed: 'Not a breed' }

      // Act
      const result = firstIncompleteStep(animal, {
        unallocatedEarTags: TAGS
      })

      // Assert
      expect(result.page).toBe('calf-details')
    })

    test('it judges the date of birth against the time it is asked', () => {
      // Arrange
      const animal = { ...calfDetails }
      const beforeTheBirth = new Date('2026-10-01T12:00:00Z')
      vi.setSystemTime(beforeTheBirth)

      // Act
      const result = firstIncompleteStep(animal, {
        unallocatedEarTags: TAGS
      })

      // Assert
      expect(result.page).toBe('calf-details')
    })
  })

  describe('withAnswers()', () => {
    test('it removes both dams when the dam type changes', () => {
      // Arrange
      const animal = {
        ...calfDetails,
        damType: 'surrogate',
        geneticDamEarTagNumber: 'UK123456501100',
        surrogateDamEarTagNumber: 'UK200000000007'
      }

      // Act
      const result = withAnswers('dam-details', animal, { damType: 'genetic' })

      // Assert
      expect(result).toEqual({ ...calfDetails, damType: 'genetic' })
    })

    test("it sets the page's answers on a calf with none", () => {
      // Arrange
      const animal = {}

      // Act
      const result = withAnswers('calf-details', animal, calfDetails)

      // Assert
      expect(result).toEqual(calfDetails)
    })

    test("it replaces the page's answers and keeps the calf's others", () => {
      // Arrange
      const animal = { ...calfDetails, sex: 'male', damType: 'genetic' }

      // Act
      const result = withAnswers('calf-details', animal, calfDetails)

      // Assert
      expect(result).toEqual({ ...calfDetails, damType: 'genetic' })
    })

    test('it takes only the answers the page owns', () => {
      // Arrange
      const answers = { ...calfDetails, damType: 'surrogate' }

      // Act
      const result = withAnswers('calf-details', {}, answers)

      // Assert
      expect(result).toEqual(calfDetails)
    })

    test('it does not change the animal it is given', () => {
      // Arrange
      const animal = { ...calfDetails, sex: 'male' }

      // Act
      withAnswers('calf-details', animal, calfDetails)

      // Assert
      expect(animal.sex).toBe('male')
    })

    test('it throws for a page that is not a step', () => {
      // Arrange
      let error

      // Act
      try {
        withAnswers('not-a-page', {}, calfDetails)
      } catch (e) {
        error = e
      }

      // Assert
      expect(error).toBeInstanceOf(Error)
      expect(error.message).toBe('No step for page "not-a-page"')
    })
  })
})
