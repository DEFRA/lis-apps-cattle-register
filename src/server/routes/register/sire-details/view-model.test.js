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
      maxFieldLength: 200
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
})
