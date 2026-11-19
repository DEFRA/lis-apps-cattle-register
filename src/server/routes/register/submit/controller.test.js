import * as submissionClient from '#server/services/be4fe/submission.js'
import { listCalves } from '../tag-list/controller.js'
import {
  submitRegistrationController,
  submitRegistrationSubmitController
} from './controller.js'

vi.mock('#server/services/be4fe/submission.js')
vi.mock('../tag-list/controller.js')

const SUBMISSION = { cph: '10/081/1234', submissionId: '7ZK-M3Q-A9D' }
const SUBMISSION_PATH = '/holdings/10/081/1234/cattle/register/7ZK-M3Q-A9D'
const READY = { animalId: 'UK123456301550', isReady: true }
const UNFINISHED = { animalId: 'UK123456301551', isReady: false }

const mocks = {
  getSubmission: vi.mocked(submissionClient.getSubmission),
  submitRegistration: vi.mocked(submissionClient.submitRegistration),
  listCalves: vi.mocked(listCalves)
}

/**
 * @returns {object} a response toolkit
 */
function toolkit() {
  return {
    view: vi.fn().mockReturnValue('viewed'),
    redirect: vi.fn().mockReturnValue('redirected')
  }
}

describe('submitRegistrationController', () => {
  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('GET', () => {
    test('it shows the declaration for a registration whose calves are all ready', async () => {
      // Arrange
      const request = { params: SUBMISSION }
      const h = toolkit()
      mocks.getSubmission.mockResolvedValueOnce({ status: 'DRAFT' })
      mocks.listCalves.mockResolvedValueOnce([READY])

      // Act
      const result = await submitRegistrationController.handler(request, h)

      // Assert
      expect(mocks.getSubmission).toHaveBeenCalledWith(SUBMISSION)
      expect(mocks.listCalves).toHaveBeenCalledWith(SUBMISSION)
      expect(h.view).toHaveBeenCalledWith(
        'register/submit/index',
        expect.objectContaining({ formAction: `${SUBMISSION_PATH}/submit` })
      )
      expect(result).toBe('viewed')
    })

    test('it returns to the list of calves while one is unfinished', async () => {
      // Arrange
      const request = { params: SUBMISSION }
      const h = toolkit()
      mocks.getSubmission.mockResolvedValueOnce({ status: 'DRAFT' })
      mocks.listCalves.mockResolvedValueOnce([READY, UNFINISHED])

      // Act
      const result = await submitRegistrationController.handler(request, h)

      // Assert
      expect(h.redirect).toHaveBeenCalledWith(SUBMISSION_PATH)
      expect(h.view).not.toHaveBeenCalled()
      expect(result).toBe('redirected')
    })

    test('it returns to the list of calves for a registration with no calf', async () => {
      // Arrange
      const request = { params: SUBMISSION }
      const h = toolkit()
      mocks.getSubmission.mockResolvedValueOnce({ status: 'DRAFT' })
      mocks.listCalves.mockResolvedValueOnce([])

      // Act
      await submitRegistrationController.handler(request, h)

      // Assert
      expect(h.redirect).toHaveBeenCalledWith(SUBMISSION_PATH)
      expect(h.view).not.toHaveBeenCalled()
    })

    test('it continues to the confirmation of a registration already sent, without judging its calves', async () => {
      // Arrange
      const request = { params: SUBMISSION }
      const h = toolkit()
      mocks.getSubmission.mockResolvedValueOnce({ status: 'SUBMITTED' })

      // Act
      await submitRegistrationController.handler(request, h)

      // Assert
      expect(h.redirect).toHaveBeenCalledWith(`${SUBMISSION_PATH}/confirmation`)
      expect(mocks.listCalves).not.toHaveBeenCalled()
      expect(h.view).not.toHaveBeenCalled()
    })

    test('it rethrows a BE4FE failure, such as an unknown submission', async () => {
      // Arrange
      const request = { params: SUBMISSION }
      const h = toolkit()
      const failure = new Error('Request failed - 404')
      mocks.getSubmission.mockRejectedValueOnce(failure)

      // Act
      let error
      try {
        await submitRegistrationController.handler(request, h)
      } catch (e) {
        error = e
      }

      // Assert
      expect(error).toBe(failure)
      expect(h.view).not.toHaveBeenCalled()
    })
  })

  describe('POST', () => {
    test('it sends the registration and continues to its confirmation', async () => {
      // Arrange
      const request = { params: SUBMISSION }
      const h = toolkit()
      mocks.getSubmission.mockResolvedValueOnce({ status: 'DRAFT' })
      mocks.listCalves.mockResolvedValueOnce([READY])

      // Act
      const result = await submitRegistrationSubmitController.handler(
        request,
        h
      )

      // Assert
      expect(mocks.submitRegistration).toHaveBeenCalledWith(SUBMISSION)
      expect(h.redirect).toHaveBeenCalledWith(`${SUBMISSION_PATH}/confirmation`)
      expect(result).toBe('redirected')
    })

    test('it sends nothing while a calf is unfinished, returning to the list of calves', async () => {
      // Arrange
      const request = { params: SUBMISSION }
      const h = toolkit()
      mocks.getSubmission.mockResolvedValueOnce({ status: 'DRAFT' })
      mocks.listCalves.mockResolvedValueOnce([UNFINISHED])

      // Act
      await submitRegistrationSubmitController.handler(request, h)

      // Assert
      expect(mocks.submitRegistration).not.toHaveBeenCalled()
      expect(h.redirect).toHaveBeenCalledWith(SUBMISSION_PATH)
    })

    test('it does not send a registration twice, continuing to its confirmation', async () => {
      // Arrange
      const request = { params: SUBMISSION }
      const h = toolkit()
      mocks.getSubmission.mockResolvedValueOnce({ status: 'SUBMITTED' })

      // Act
      await submitRegistrationSubmitController.handler(request, h)

      // Assert
      expect(mocks.submitRegistration).not.toHaveBeenCalled()
      expect(h.redirect).toHaveBeenCalledWith(`${SUBMISSION_PATH}/confirmation`)
    })

    test('it rethrows a failure to send, redirecting nowhere', async () => {
      // Arrange
      const request = { params: SUBMISSION }
      const h = toolkit()
      const failure = new Error('503 - Service unavailable')
      mocks.getSubmission.mockResolvedValueOnce({ status: 'DRAFT' })
      mocks.listCalves.mockResolvedValueOnce([READY])
      mocks.submitRegistration.mockRejectedValueOnce(failure)

      // Act
      let error
      try {
        await submitRegistrationSubmitController.handler(request, h)
      } catch (e) {
        error = e
      }

      // Assert
      expect(error).toBe(failure)
      expect(h.redirect).not.toHaveBeenCalled()
    })
  })
})
