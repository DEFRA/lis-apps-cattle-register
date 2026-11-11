import { buildViewModel } from './view-model.js'

const request = {
  params: { cph: '10/081/1234', submissionId: '7ZK-M3Q-A9D', animalId: '1' }
}
const CALF_EAR_TAG = 'UK123456301550'

describe('buildViewModel()', () => {
  test('it builds the page about the calf with no errors', () => {
    // Arrange
    const options = {
      request,
      calfEarTagNumber: CALF_EAR_TAG,
      geneticDamEarTagNumber: '',
      earTagItems: []
    }

    // Act
    const result = buildViewModel(options)

    // Assert
    expect(result).toEqual({
      pageTitle: 'Genetic dam details',
      heading: 'Genetic dam details',
      calfEarTagNumber: 'UK 123456 301550',
      backLinkHref:
        '/holdings/10/081/1234/cattle/register/7ZK-M3Q-A9D/calves/1/dam-details',
      formAction:
        '/holdings/10/081/1234/cattle/register/7ZK-M3Q-A9D/calves/1/genetic-dam',
      values: { geneticDamEarTagNumber: '' },
      earTagItems: [],
      maxFieldLength: 200,
      errorList: [],
      fieldErrors: {}
    })
  })

  test("it offers the holding's dams", () => {
    // Arrange
    const options = {
      request,
      calfEarTagNumber: CALF_EAR_TAG,
      geneticDamEarTagNumber: 'UK200000000007',
      earTagItems: ['UK200000000007', 'UK200000000008']
    }

    // Act
    const result = buildViewModel(options)

    // Assert
    expect(result.values).toEqual({ geneticDamEarTagNumber: 'UK200000000007' })
    expect(result.earTagItems).toEqual(['UK200000000007', 'UK200000000008'])
  })

  test('it lists the error, marking the title', () => {
    // Arrange
    const options = {
      request,
      calfEarTagNumber: CALF_EAR_TAG,
      geneticDamEarTagNumber: '',
      earTagItems: [],
      errors: [{ field: 'geneticDamEarTagNumber', code: 'required' }]
    }

    // Act
    const result = buildViewModel(options)

    // Assert
    expect(result.pageTitle).toBe('Error: Genetic dam details')
    expect(result.errorList).toEqual([
      {
        text: 'Enter the ear tag number of the genetic dam',
        href: '#geneticDamEarTagNumber'
      }
    ])
    expect(result.fieldErrors).toEqual({
      geneticDamEarTagNumber: {
        text: 'Enter the ear tag number of the genetic dam'
      }
    })
  })
})
