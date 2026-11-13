import * as registrationClient from '#server/services/registration-client.js'
import { MAX_CALVES } from '../tag-list/messages.js'
import {
  calfDetailsController,
  calfDetailsSubmitController
} from './controller.js'

vi.mock('#server/services/registration-client.js')

const CPH = '10/081/1234'
const SUBMISSION_ID = '7ZK-M3Q-A9D'
const ANIMAL_ID = 'UK123456301550'
const SUBMISSION_PATH = `/holdings/10/081/1234/cattle/register/${SUBMISSION_ID}`
const today = new Date()
const TODAY = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`

const validAnswers = {
  earTagNumber: ANIMAL_ID,
  dateOfBirth: TODAY,
  sex: 'female',
  breed: 'AA'
}

const mocks = {
  getAnimal: vi.mocked(registrationClient.getAnimal),
  getSubmission: vi.mocked(registrationClient.getSubmission),
  saveAnimal: vi.mocked(registrationClient.saveAnimal),
  getUnallocatedEarTags: vi.mocked(registrationClient.getUnallocatedEarTags)
}

const controllers = [
  ['GET', calfDetailsController, {}],
  ['POST', calfDetailsSubmitController, { payload: validAnswers }]
]

/**
 * @param {number} count
 * @returns {{ animals: { animalId: string, earTagNumber: string }[] }} a
 *   submission with that many calves
 */
function submissionOf(count) {
  const animals = Array.from({ length: count }, (_, index) => {
    const id = `UK1234563${String(index).padStart(5, '0')}`
    return { animalId: id, earTagNumber: id }
  })

  return { submissionId: SUBMISSION_ID, status: 'DRAFT', animals }
}

/**
 * @returns {object} a response toolkit
 */
function toolkit() {
  const response = { code: vi.fn() }
  response.code.mockReturnValue(response)

  return {
    view: vi.fn().mockReturnValue(response),
    redirect: vi.fn().mockReturnValue('redirected')
  }
}

describe('calfDetailsController calf limit', () => {
  beforeEach(() => {
    mocks.getAnimal.mockResolvedValue(validAnswers)
    mocks.saveAnimal.mockResolvedValue({ animalId: ANIMAL_ID })
    mocks.getUnallocatedEarTags.mockResolvedValue([ANIMAL_ID])
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  test.each(controllers)(
    '%s for a new calf, in a registration with the most calves allowed, returns to the list of calves, saving nothing',
    async (_, controller, extra) => {
      // Arrange
      const request = {
        params: { cph: CPH, submissionId: SUBMISSION_ID },
        ...extra
      }
      const h = toolkit()
      mocks.getSubmission.mockResolvedValue(submissionOf(MAX_CALVES))

      // Act
      const result = await controller.handler(request, h)

      // Assert
      expect(h.redirect).toHaveBeenCalledWith(SUBMISSION_PATH)
      expect(result).toBe('redirected')
      expect(h.view).not.toHaveBeenCalled()
      expect(mocks.saveAnimal).not.toHaveBeenCalled()
    }
  )

  test('GET for a new calf, in a registration with room for one more, renders the page', async () => {
    // Arrange
    const request = { params: { cph: CPH, submissionId: SUBMISSION_ID } }
    const h = toolkit()
    mocks.getSubmission.mockResolvedValue(submissionOf(MAX_CALVES - 1))

    // Act
    await calfDetailsController.handler(request, h)

    // Assert
    expect(h.view).toHaveBeenCalled()
    expect(h.redirect).not.toHaveBeenCalled()
  })

  test('POST for a new calf, in a registration with room for one more, saves it', async () => {
    // Arrange
    const request = {
      params: { cph: CPH, submissionId: SUBMISSION_ID },
      payload: validAnswers
    }
    const h = toolkit()
    mocks.getSubmission.mockResolvedValue(submissionOf(MAX_CALVES - 1))

    // Act
    await calfDetailsSubmitController.handler(request, h)

    // Assert
    expect(mocks.saveAnimal).toHaveBeenCalled()
    expect(h.redirect).not.toHaveBeenCalledWith(SUBMISSION_PATH)
  })

  test('GET for a calf the registration has, when it has the most calves allowed, renders the page', async () => {
    // Arrange
    const request = {
      params: { cph: CPH, submissionId: SUBMISSION_ID, animalId: ANIMAL_ID }
    }
    const h = toolkit()
    mocks.getSubmission.mockResolvedValue(submissionOf(MAX_CALVES))

    // Act
    await calfDetailsController.handler(request, h)

    // Assert
    expect(h.view).toHaveBeenCalled()
    expect(h.redirect).not.toHaveBeenCalled()
  })

  test('POST for a calf the registration has, when it has the most calves allowed, saves it', async () => {
    // Arrange
    const request = {
      params: { cph: CPH, submissionId: SUBMISSION_ID, animalId: ANIMAL_ID },
      payload: validAnswers
    }
    const h = toolkit()
    mocks.getSubmission.mockResolvedValue(submissionOf(MAX_CALVES))

    // Act
    await calfDetailsSubmitController.handler(request, h)

    // Assert
    expect(mocks.saveAnimal).toHaveBeenCalled()
    expect(h.redirect).not.toHaveBeenCalledWith(SUBMISSION_PATH)
  })
})
