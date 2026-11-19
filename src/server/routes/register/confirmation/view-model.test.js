import { buildViewModel } from './view-model.js'

const REQUEST = {
  params: { cph: '10/081/1234', submissionId: '7ZK-M3Q-A9D' }
}

describe('buildViewModel()', () => {
  test('it confirms how many births were registered, returning to the holding overview', () => {
    // Arrange
    const options = { request: REQUEST, calfCount: 5 }

    // Act
    const result = buildViewModel(options)

    // Assert
    expect(result).toEqual({
      pageTitle: '5 cattle births registered',
      heading: '5 cattle births registered',
      homeHref: '/holdings/10/081/1234/cattle'
    })
  })

  test('it words a single birth as one calf', () => {
    // Arrange
    const options = { request: REQUEST, calfCount: 1 }

    // Act
    const result = buildViewModel(options)

    // Assert
    expect(result.heading).toBe('1 calf birth registered')
    expect(result.pageTitle).toBe('1 calf birth registered')
  })
})
