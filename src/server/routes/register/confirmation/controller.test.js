import Boom from '@hapi/boom'
import * as submissionClient from '#server/services/be4fe/submission.js'
import { confirmationController } from './controller.js'

vi.mock('#server/services/be4fe/submission.js')

const SUBMISSION = { cph: '10/081/1234', submissionId: '7ZK-M3Q-A9D' }
const CATTLE_ON_HOLDING_PATH = '/holdings/10/081/1234/cattle/animals'

const mocks = {
  getSubmission: vi.mocked(submissionClient.getSubmission)
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

describe('confirmationController', () => {
  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('GET', () => {
    test('it confirms a registration that has been sent, counting its calves', async () => {
      // Arrange
      const request = { params: SUBMISSION }
      const h = toolkit()
      mocks.getSubmission.mockResolvedValueOnce({
        status: 'SUBMITTED',
        animals: [
          { animalId: 'UK123456301550' },
          { animalId: 'UK123456301551' }
        ]
      })

      // Act
      const result = await confirmationController.handler(request, h)

      // Assert
      expect(mocks.getSubmission).toHaveBeenCalledWith(SUBMISSION)
      expect(h.view).toHaveBeenCalledWith(
        'register/confirmation/index',
        expect.objectContaining({ heading: '2 cattle births registered' })
      )
      expect(result).toBe('viewed')
    })

    test("it goes to the holding's cattle for a registration not yet sent", async () => {
      // Arrange
      const request = { params: SUBMISSION }
      const h = toolkit()
      mocks.getSubmission.mockResolvedValueOnce({
        status: 'DRAFT',
        animals: [{ animalId: 'UK123456301550' }]
      })

      // Act
      const result = await confirmationController.handler(request, h)

      // Assert
      expect(h.redirect).toHaveBeenCalledWith(CATTLE_ON_HOLDING_PATH)
      expect(h.view).not.toHaveBeenCalled()
      expect(result).toBe('redirected')
    })

    test("it goes to the holding's cattle for a registration there is not", async () => {
      // Arrange
      const request = { params: SUBMISSION }
      const h = toolkit()
      mocks.getSubmission.mockRejectedValueOnce(Boom.notFound())

      // Act
      await confirmationController.handler(request, h)

      // Assert
      expect(h.redirect).toHaveBeenCalledWith(CATTLE_ON_HOLDING_PATH)
      expect(h.view).not.toHaveBeenCalled()
    })

    test('it rethrows any other BE4FE failure', async () => {
      // Arrange
      const request = { params: SUBMISSION }
      const h = toolkit()
      const failure = new Error('503 - Service unavailable')
      mocks.getSubmission.mockRejectedValueOnce(failure)

      // Act
      let error
      try {
        await confirmationController.handler(request, h)
      } catch (e) {
        error = e
      }

      // Assert
      expect(error).toBe(failure)
      expect(h.redirect).not.toHaveBeenCalled()
    })
  })
})
