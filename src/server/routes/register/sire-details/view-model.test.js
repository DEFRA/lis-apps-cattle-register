import { buildViewModel, formValuesFrom } from './view-model.js'

const request = {
  params: {
    cph: '10/081/1234',
    submissionId: '7ZK-M3Q-A9D',
    animalId: 'UK123456301551'
  }
}
const CALF_PATH =
  '/holdings/10/081/1234/cattle/register/7ZK-M3Q-A9D/calves/UK123456301551'

describe('buildViewModel()', () => {
  test('it builds the page about the calf, going back to its dam page', () => {
    // Arrange
    const options = {
      request,
      calfEarTagNumber: 'UK123456301550',
      values: { sireEarTagNumber: 'UK123456701300', sireName: 'Duke' },
      backPage: 'surrogate-dam'
    }

    // Act
    const result = buildViewModel(options)

    // Assert
    expect(result).toEqual({
      pageTitle: 'Sire details',
      heading: 'Sire details',
      calfEarTagNumber: 'UK 123456 301550',
      backLinkHref: `${CALF_PATH}/surrogate-dam`,
      formAction: `${CALF_PATH}/sire-details`,
      values: { sireEarTagNumber: 'UK123456701300', sireName: 'Duke' },
      errorList: [],
      fieldErrors: {}
    })
  })

  test('it lists each error by field, marking the title', () => {
    // Arrange
    const options = {
      request,
      calfEarTagNumber: 'UK123456301550',
      values: { sireEarTagNumber: '9'.repeat(26), sireName: 'Duke' },
      backPage: 'genetic-dam',
      errors: [{ field: 'sireEarTagNumber', code: 'tooLong' }]
    }

    // Act
    const result = buildViewModel(options)

    // Assert
    expect(result.pageTitle).toBe('Error: Sire details')
    expect(result.errorList).toEqual([
      {
        text: 'Sire ear tag number must be 15 characters or fewer',
        href: '#sireEarTagNumber'
      }
    ])
    expect(result.fieldErrors).toEqual({
      sireEarTagNumber: {
        text: 'Sire ear tag number must be 15 characters or fewer'
      }
    })
  })

  test('it does not show again an answer of more than 256 characters, but still words its error', () => {
    // Arrange
    const options = {
      request,
      calfEarTagNumber: 'UK123456301550',
      values: { sireEarTagNumber: 'UK123456701300', sireName: 'D'.repeat(257) },
      backPage: 'genetic-dam',
      errors: [{ field: 'sireName', code: 'tooLong' }]
    }

    // Act
    const result = buildViewModel(options)

    // Assert
    expect(result.values).toEqual({
      sireEarTagNumber: 'UK123456701300',
      sireName: ''
    })
    expect(result.fieldErrors).toEqual({
      sireName: { text: 'Sire name must be 200 characters or fewer' }
    })
  })
})

describe('formValuesFrom()', () => {
  test("it takes the page's answers, leaving the others", () => {
    // Arrange
    const animal = { sireName: 'Duke', sex: 'female' }

    // Act
    const result = formValuesFrom(animal)

    // Assert
    expect(result).toEqual({ sireEarTagNumber: '', sireName: 'Duke' })
  })

  test('it shows an answer saved with nothing given as blank', () => {
    // Arrange
    const animal = { sireEarTagNumber: null, sireName: 'Duke' }

    // Act
    const result = formValuesFrom(animal)

    // Assert
    expect(result).toEqual({ sireEarTagNumber: '', sireName: 'Duke' })
  })
})
