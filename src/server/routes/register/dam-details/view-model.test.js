import { buildViewModel } from './view-model.js'

const request = {
  params: { cph: '10/081/1234', submissionId: '7ZK-M3Q-A9D', animalId: '2' }
}
const CALF_PATH = '/holdings/10/081/1234/cattle/register/7ZK-M3Q-A9D/calves/2'

describe('buildViewModel()', () => {
  test('it builds the page about the calf with no errors', () => {
    // Arrange
    const options = {
      request,
      calfEarTagNumber: 'UK123456301550',
      damType: 'genetic'
    }

    // Act
    const result = buildViewModel(options)

    // Assert
    expect(result).toEqual({
      pageTitle: 'Dam details',
      heading: 'Dam details',
      calfEarTagNumber: 'UK 123456 301550',
      backLinkHref: `${CALF_PATH}/calf-details`,
      formAction: `${CALF_PATH}/dam-details`,
      values: { damType: 'genetic' },
      errorList: [],
      fieldErrors: {}
    })
  })

  test('it lists the error, marking the title', () => {
    // Arrange
    const options = {
      request,
      calfEarTagNumber: 'UK123456301550',
      damType: '',
      errors: [{ field: 'damType', code: 'required' }]
    }

    // Act
    const result = buildViewModel(options)

    // Assert
    expect(result.pageTitle).toBe('Error: Dam details')
    expect(result.errorList).toEqual([
      {
        text: 'Select if the calf was born via a genetic or surrogate dam',
        href: '#damType'
      }
    ])
    expect(result.fieldErrors).toEqual({
      damType: {
        text: 'Select if the calf was born via a genetic or surrogate dam'
      }
    })
  })
})
