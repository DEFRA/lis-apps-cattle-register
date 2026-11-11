import { buildViewModel } from './view-model.js'

const request = {
  params: { cph: '10/081/1234', submissionId: '7ZK-M3Q-A9D', animalId: '1' }
}
const CALF_EAR_TAG = 'UK123456301550'
const EMPTY = { geneticDamEarTagNumber: '', surrogateDamEarTagNumber: '' }

describe('buildViewModel()', () => {
  test('it builds the page about the calf with no errors', () => {
    // Arrange
    const options = {
      request,
      calfEarTagNumber: CALF_EAR_TAG,
      values: EMPTY,
      earTagItems: []
    }

    // Act
    const result = buildViewModel(options)

    // Assert
    expect(result).toEqual({
      pageTitle: 'Genetic and surrogate dam details',
      heading: 'Genetic and surrogate dam details',
      calfEarTagNumber: 'UK 123456 301550',
      backLinkHref:
        '/holdings/10/081/1234/cattle/register/7ZK-M3Q-A9D/calves/1/dam-details',
      formAction:
        '/holdings/10/081/1234/cattle/register/7ZK-M3Q-A9D/calves/1/surrogate-dam',
      values: EMPTY,
      earTagItems: [],
      maxFieldLength: 200,
      errorList: [],
      fieldErrors: {}
    })
  })

  test("it shows the answers and offers the holding's dams", () => {
    // Arrange
    const values = {
      geneticDamEarTagNumber: 'UK123456501100',
      surrogateDamEarTagNumber: 'UK200000000007'
    }
    const options = {
      request,
      calfEarTagNumber: CALF_EAR_TAG,
      values,
      earTagItems: ['UK200000000007', 'UK200000000008']
    }

    // Act
    const result = buildViewModel(options)

    // Assert
    expect(result.values).toEqual(values)
    expect(result.earTagItems).toEqual(['UK200000000007', 'UK200000000008'])
  })

  test('it lists the errors in order, marking the title', () => {
    // Arrange
    const options = {
      request,
      calfEarTagNumber: CALF_EAR_TAG,
      values: EMPTY,
      earTagItems: [],
      errors: [
        { field: 'geneticDamEarTagNumber', code: 'required' },
        { field: 'surrogateDamEarTagNumber', code: 'required' }
      ]
    }

    // Act
    const result = buildViewModel(options)

    // Assert
    expect(result.pageTitle).toBe('Error: Genetic and surrogate dam details')
    expect(result.errorList).toEqual([
      {
        text: 'Enter the ear tag number of the genetic dam',
        href: '#geneticDamEarTagNumber'
      },
      {
        text: 'Enter the ear tag number of the surrogate dam',
        href: '#surrogateDamEarTagNumber'
      }
    ])
    expect(result.fieldErrors).toEqual({
      geneticDamEarTagNumber: {
        text: 'Enter the ear tag number of the genetic dam'
      },
      surrogateDamEarTagNumber: {
        text: 'Enter the ear tag number of the surrogate dam'
      }
    })
  })
})
