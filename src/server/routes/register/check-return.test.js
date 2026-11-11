import {
  backLinkPath,
  isReturningToCheck,
  keepReturn,
  pathAfterSave,
  withReturnToCheck
} from './check-return.js'

const params = {
  cph: '10/081/1234',
  submissionId: '7ZK-M3Q-A9D',
  animalId: 'UK123456301550'
}
const CALF_PATH =
  '/holdings/10/081/1234/cattle/register/7ZK-M3Q-A9D/calves/UK123456301550'
const fromJourney = { params, query: {} }
const fromChangeLink = { params, query: { return: 'check' } }
const complete = {
  earTagNumber: 'UK123456301550',
  dateOfBirth: '1/11/2026',
  sex: 'female',
  breed: 'AA',
  damType: 'genetic',
  geneticDamEarTagNumber: 'UK200000000007',
  sireEarTagNumber: null,
  sireName: null
}

describe('check-return', () => {
  describe('isReturningToCheck()', () => {
    test.each([
      ['a Change link', fromChangeLink, true],
      ['the journey', fromJourney, false],
      ['a request with no query', { params }, false],
      [
        'another return value',
        { params, query: { return: 'https://x' } },
        false
      ]
    ])('it is %s: %s', (_description, request, expected) => {
      // Arrange
      // Act
      const result = isReturningToCheck(request)

      // Assert
      expect(result).toBe(expected)
    })
  })

  describe('withReturnToCheck()', () => {
    test('it marks the path', () => {
      // Arrange
      const path = `${CALF_PATH}/sire-details`

      // Act
      const result = withReturnToCheck(path)

      // Assert
      expect(result).toBe(`${CALF_PATH}/sire-details?return=check`)
    })
  })

  describe('keepReturn()', () => {
    test('it keeps the mark of a request from a Change link', () => {
      // Arrange
      const path = `${CALF_PATH}/sire-details`

      // Act
      const result = keepReturn(fromChangeLink, path)

      // Assert
      expect(result).toBe(`${CALF_PATH}/sire-details?return=check`)
    })

    test('it leaves the path of a request from the journey', () => {
      // Arrange
      const path = `${CALF_PATH}/sire-details`

      // Act
      const result = keepReturn(fromJourney, path)

      // Assert
      expect(result).toBe(path)
    })
  })

  describe('pathAfterSave()', () => {
    test("it continues the journey to the calf's next page", () => {
      // Arrange
      const animal = { ...complete, damType: 'surrogate' }

      // Act
      const result = pathAfterSave(fromJourney, 'dam-details', animal)

      // Assert
      expect(result).toBe(`${CALF_PATH}/surrogate-dam`)
    })

    test('it continues the journey to check calf details after the last page', () => {
      // Arrange
      const animal = { ...complete }

      // Act
      const result = pathAfterSave(fromJourney, 'sire-details', animal)

      // Assert
      expect(result).toBe(`${CALF_PATH}/check-calf-details`)
    })

    test('it returns to check calf details after a Change link', () => {
      // Arrange
      const animal = { ...complete }

      // Act
      const result = pathAfterSave(fromChangeLink, 'calf-details', animal)

      // Assert
      expect(result).toBe(`${CALF_PATH}/check-calf-details`)
    })

    test('it goes to the page a change left unanswered, still marked to return', () => {
      // Arrange
      const animal = {
        ...complete,
        damType: 'surrogate',
        geneticDamEarTagNumber: undefined
      }

      // Act
      const result = pathAfterSave(fromChangeLink, 'dam-details', animal)

      // Assert
      expect(result).toBe(`${CALF_PATH}/surrogate-dam?return=check`)
    })
  })

  describe('backLinkPath()', () => {
    test('it is check calf details after a Change link', () => {
      // Arrange
      const previousPath = `${CALF_PATH}/dam-details`

      // Act
      const result = backLinkPath(fromChangeLink, previousPath)

      // Assert
      expect(result).toBe(`${CALF_PATH}/check-calf-details`)
    })

    test('it is the previous page in the journey', () => {
      // Arrange
      const previousPath = `${CALF_PATH}/dam-details`

      // Act
      const result = backLinkPath(fromJourney, previousPath)

      // Assert
      expect(result).toBe(previousPath)
    })
  })
})
