import { buildViewModel } from './view-model.js'

const request = {
  params: {
    cph: '10/081/1234',
    submissionId: '7ZK-M3Q-A9D',
    animalId: 'UK123456301551'
  }
}
const CALF_PATH =
  '/holdings/10/081/1234/cattle/register/7ZK-M3Q-A9D/calves/UK123456301551'
const animal = {
  earTagNumber: 'UK123456301550',
  dateOfBirth: '1/11/2026',
  sex: 'female',
  breed: 'AA',
  damType: 'genetic',
  geneticDamEarTagNumber: 'UK200000000007',
  sireEarTagNumber: 'UK123456701300',
  sireName: 'Duke'
}

/**
 * @param {object[]} rows
 * @returns {string[][]} each row as its key, value, Change link and the
 *   link's hidden text
 */
function summaryOf(rows) {
  return rows.map(({ key, value, actions }) => [
    key.text,
    value.text,
    actions.items[0].href,
    actions.items[0].visuallyHiddenText
  ])
}

describe('buildViewModel()', () => {
  test('it builds the page about the calf', () => {
    // Arrange
    const options = { request, animal }

    // Act
    const result = buildViewModel(options)

    // Assert
    expect(result).toEqual({
      pageTitle: 'Check calf details',
      heading: 'Check calf details',
      calfEarTagNumber: 'UK 123456 301550',
      backLinkHref: `${CALF_PATH}/sire-details`,
      formAction: `${CALF_PATH}/check-calf-details`,
      cancelHref: `${CALF_PATH}/cancel`,
      rows: expect.any(Array)
    })
  })

  test('it lists the answers of a calf born via a genetic dam, each with a Change link that returns', () => {
    // Arrange
    const options = { request, animal }

    // Act
    const result = buildViewModel(options)

    // Assert
    const calfDetails = `${CALF_PATH}/calf-details?return=check`
    const sireDetails = `${CALF_PATH}/sire-details?return=check`
    expect(summaryOf(result.rows)).toEqual([
      [
        'Animal ear tag number',
        'UK 123456 301550',
        calfDetails,
        'ear tag number'
      ],
      ['Date of birth', '1 November 2026', calfDetails, 'date of birth'],
      ['Sex', 'Female', calfDetails, 'sex'],
      ['Breed', 'Aberdeen Angus (AA)', calfDetails, 'breed'],
      [
        'Dam type',
        'Genetic',
        `${CALF_PATH}/dam-details?return=check`,
        'dam type'
      ],
      [
        'Genetic dam ear tag number',
        'UK 200000 000007',
        `${CALF_PATH}/genetic-dam?return=check`,
        'genetic dam ear tag number'
      ],
      [
        'Sire ear tag number',
        'UK 123456 701300',
        sireDetails,
        'sire ear tag number'
      ],
      ['Sire name', 'Duke', sireDetails, 'sire name']
    ])
  })

  test('it lists both dams of a calf born via a surrogate, changed on the one page', () => {
    // Arrange
    const options = {
      request,
      animal: {
        ...animal,
        damType: 'surrogate',
        geneticDamEarTagNumber: 'UK123456501100',
        surrogateDamEarTagNumber: 'UK200000000007'
      }
    }

    // Act
    const result = buildViewModel(options)

    // Assert
    const surrogateDam = `${CALF_PATH}/surrogate-dam?return=check`
    expect(summaryOf(result.rows).slice(4, 7)).toEqual([
      [
        'Dam type',
        'Surrogate',
        `${CALF_PATH}/dam-details?return=check`,
        'dam type'
      ],
      [
        'Genetic dam ear tag number',
        'UK 123456 501100',
        surrogateDam,
        'genetic dam ear tag number'
      ],
      [
        'Surrogate dam ear tag number',
        'UK 200000 000007',
        surrogateDam,
        'surrogate dam ear tag number'
      ]
    ])
  })

  test('it shows sire answers left blank as not provided', () => {
    // Arrange
    const options = {
      request,
      animal: { ...animal, sireEarTagNumber: '', sireName: '' }
    }

    // Act
    const result = buildViewModel(options)

    // Assert
    expect(summaryOf(result.rows).slice(-2)).toEqual([
      [
        'Sire ear tag number',
        'Not provided',
        `${CALF_PATH}/sire-details?return=check`,
        'sire ear tag number'
      ],
      [
        'Sire name',
        'Not provided',
        `${CALF_PATH}/sire-details?return=check`,
        'sire name'
      ]
    ])
  })
})
