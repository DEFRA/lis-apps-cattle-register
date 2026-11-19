import { buildViewModel } from './view-model.js'

const SUBMISSION_PATH = '/holdings/10/081/1234/cattle/register/7ZK-M3Q-A9D'

describe('buildViewModel()', () => {
  test('it sends the registration from its own page, with Back returning to the list of calves', () => {
    // Arrange
    const options = {
      request: {
        params: { cph: '10/081/1234', submissionId: '7ZK-M3Q-A9D' }
      }
    }

    // Act
    const result = buildViewModel(options)

    // Assert
    expect(result).toEqual({
      pageTitle: 'Now send your cattle birth registration',
      heading: 'Now send your cattle birth registration',
      backLinkHref: SUBMISSION_PATH,
      formAction: `${SUBMISSION_PATH}/submit`
    })
  })
})
