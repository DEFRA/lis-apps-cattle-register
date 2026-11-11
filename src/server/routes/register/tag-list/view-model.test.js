import { buildViewModel } from './view-model.js'

const request = { params: { cph: '10/081/1234', submissionId: '7ZK-M3Q-A9D' } }
const SUBMISSION_PATH = '/holdings/10/081/1234/cattle/register/7ZK-M3Q-A9D'
const ready = {
  animalId: '1',
  earTagNumber: 'UK123456301550',
  page: 'check-calf-details',
  isReady: true
}
const unfinished = {
  animalId: '2',
  earTagNumber: 'UK123456301551',
  page: 'dam-details',
  isReady: false
}

describe('buildViewModel()', () => {
  test('it lists the calves with where each row links to, going back to the last', () => {
    // Arrange
    const options = { request, calves: [ready, unfinished] }

    // Act
    const result = buildViewModel(options)

    // Assert
    expect(result).toEqual({
      pageTitle: 'Register new cattle births',
      heading: 'Register new cattle births',
      backLinkHref: `${SUBMISSION_PATH}/calves/2/dam-details`,
      formAction: `${SUBMISSION_PATH}/tag-list`,
      calves: [
        {
          id: 'calf-1',
          earTagNumber: 'UK 123456 301550',
          href: `${SUBMISSION_PATH}/calves/1/check-calf-details`,
          isReady: true
        },
        {
          id: 'calf-2',
          earTagNumber: 'UK 123456 301551',
          href: `${SUBMISSION_PATH}/calves/2/dam-details`,
          isReady: false
        }
      ],
      values: { addAnother: '' },
      errorList: [],
      fieldErrors: {}
    })
  })

  test('it goes back to where the first calf is added when no calves are left', () => {
    // Arrange
    const options = { request, calves: [] }

    // Act
    const result = buildViewModel(options)

    // Assert
    expect(result.calves).toEqual([])
    expect(result.backLinkHref).toBe(`${SUBMISSION_PATH}/calves/1/calf-details`)
  })

  test('it links a field error to its field, marking the title and keeping the answer', () => {
    // Arrange
    const options = {
      request,
      calves: [ready],
      addAnother: 'yes',
      errors: [{ field: 'addAnother', code: 'tooMany' }]
    }

    // Act
    const result = buildViewModel(options)

    // Assert
    const text =
      'You can add up to 50 animals to one registration. Select no to continue'
    expect(result.pageTitle).toBe('Error: Register new cattle births')
    expect(result.values).toEqual({ addAnother: 'yes' })
    expect(result.errorList).toEqual([{ text, href: '#addAnother' }])
    expect(result.fieldErrors).toEqual({ addAnother: { text } })
  })

  test('it links the incomplete error to the first calf to complete', () => {
    // Arrange
    const options = {
      request,
      calves: [ready, unfinished],
      addAnother: 'no',
      errors: [{ field: 'calves', code: 'incomplete' }]
    }

    // Act
    const result = buildViewModel(options)

    // Assert
    expect(result.errorList).toEqual([
      {
        text: 'Complete all required animal details before continuing',
        href: '#calf-2'
      }
    ])
  })
})
