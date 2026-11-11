import { buildViewModel } from './view-model.js'

const CALF_PATH = '/holdings/10/081/1234/cattle/register/7ZK-M3Q-A9D/calves/2'

describe('buildViewModel()', () => {
  test('it asks about the calf, with No and Back returning to check calf details', () => {
    // Arrange
    const options = {
      request: {
        params: {
          cph: '10/081/1234',
          submissionId: '7ZK-M3Q-A9D',
          animalId: '2'
        }
      },
      animal: { earTagNumber: 'UK123456301550' }
    }

    // Act
    const result = buildViewModel(options)

    // Assert
    expect(result).toEqual({
      pageTitle: 'Are you sure you want to cancel this registration?',
      heading: 'Are you sure you want to cancel this registration?',
      calfEarTagNumber: 'UK 123456 301550',
      backLinkHref: `${CALF_PATH}/check-calf-details`,
      keepHref: `${CALF_PATH}/check-calf-details`,
      formAction: `${CALF_PATH}/cancel`
    })
  })
})
