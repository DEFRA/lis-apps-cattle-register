import { buildViewModel, formValuesFrom } from './view-model.js'

const request = {
  params: {
    cph: '10/081/1234',
    submissionId: '7ZK-M3Q-A9D',
    animalId: '1'
  }
}
const values = {
  earTagNumber: 'UK123456301550',
  dateOfBirth: '1/11/2026',
  sex: 'female',
  breed: 'Aberdeen Angus (AA)'
}

describe('formValuesFrom()', () => {
  test('it keeps each saved answer', () => {
    // Arrange
    const answers = values

    // Act
    const result = formValuesFrom(answers)

    // Assert
    expect(result).toEqual(values)
  })

  test('it blanks an answer that is not saved, dropping anything else', () => {
    // Arrange
    const answers = { earTagNumber: 'UK123456301550', other: 'x' }

    // Act
    const result = formValuesFrom(answers)

    // Assert
    expect(result).toEqual({
      earTagNumber: 'UK123456301550',
      dateOfBirth: '',
      sex: '',
      breed: ''
    })
  })
})

describe('buildViewModel()', () => {
  test('it builds the page with the values and no errors', () => {
    // Arrange
    const options = { request, values }

    // Act
    const result = buildViewModel(options)

    // Assert
    expect(result).toMatchObject({
      pageTitle: 'Calf details',
      heading: 'Calf details',
      backLinkHref: '/holdings/10/081/1234/cattle',
      formAction:
        '/holdings/10/081/1234/cattle/register/7ZK-M3Q-A9D/calves/1/calf-details',
      values,
      maxFieldLength: 200,
      errorList: [],
      fieldErrors: {},
      warnings: [],
      acknowledgedLateDateOfBirth: ''
    })
    expect(result.breedItems.length).toBeGreaterThan(1)
    expect(result.maxDateOfBirth).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}$/)
  })

  test('it lists each error by field, marking the title', () => {
    // Arrange
    const options = {
      request,
      values,
      errors: [
        { field: 'earTagNumber', code: 'required' },
        { field: 'sex', code: 'required' }
      ]
    }

    // Act
    const result = buildViewModel(options)

    // Assert
    expect(result.pageTitle).toBe('Error: Calf details')
    expect(result.errorList).toEqual([
      { text: 'Enter the animal ear tag number', href: '#earTagNumber' },
      { text: 'Select if the animal is male or female', href: '#sex' }
    ])
    expect(result.fieldErrors).toEqual({
      earTagNumber: { text: 'Enter the animal ear tag number' },
      sex: { text: 'Select if the animal is male or female' }
    })
  })

  test('it carries the warnings and the acknowledged date', () => {
    // Arrange
    const options = {
      request,
      values,
      warnings: [{ field: 'dateOfBirth', code: 'overDeadline' }],
      acknowledgedLateDateOfBirth: '1/11/2026'
    }

    // Act
    const result = buildViewModel(options)

    // Assert
    expect(result.warnings).toEqual([
      'Date of birth is over the 27-day deadline to report a calf birth.'
    ])
    expect(result.acknowledgedLateDateOfBirth).toBe('1/11/2026')
  })
})
