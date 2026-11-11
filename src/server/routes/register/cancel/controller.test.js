import * as registrationClient from '#server/services/registration-client.js'
import {
  cancelCalfController,
  cancelCalfSubmitController
} from './controller.js'

vi.mock('#server/services/registration-client.js')

const CPH = '10/081/1234'
const CALF = { submissionId: '7ZK-M3Q-A9D', animalId: '2' }
const SUBMISSION_PATH = '/holdings/10/081/1234/cattle/register/7ZK-M3Q-A9D'

const mocks = {
  getAnimal: vi.mocked(registrationClient.getAnimal),
  removeAnimal: vi.mocked(registrationClient.removeAnimal)
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

describe('cancelCalfController', () => {
  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('GET', () => {
    test('it asks whether to cancel registering the calf', async () => {
      // Arrange
      const request = { params: { cph: CPH, ...CALF } }
      const h = toolkit()
      mocks.getAnimal.mockResolvedValueOnce({ earTagNumber: 'UK123456301550' })

      // Act
      const result = await cancelCalfController.handler(request, h)

      // Assert
      expect(mocks.getAnimal).toHaveBeenCalledWith(CALF)
      expect(h.view).toHaveBeenCalledWith(
        'register/cancel/index',
        expect.objectContaining({
          calfEarTagNumber: 'UK 123456 301550',
          formAction: `${SUBMISSION_PATH}/calves/2/cancel`
        })
      )
      expect(result).toBe('viewed')
    })

    test('it sends a calf with nothing saved to the list of calves', async () => {
      // Arrange
      const request = { params: { cph: CPH, ...CALF } }
      const h = toolkit()
      mocks.getAnimal.mockResolvedValueOnce({})

      // Act
      const result = await cancelCalfController.handler(request, h)

      // Assert
      expect(h.redirect).toHaveBeenCalledWith(SUBMISSION_PATH)
      expect(h.view).not.toHaveBeenCalled()
      expect(result).toBe('redirected')
    })

    test('it rethrows a BE4FE failure, such as an unknown submission', async () => {
      // Arrange
      const request = { params: { cph: CPH, ...CALF } }
      const h = toolkit()
      const failure = new Error('Request failed - 404')
      mocks.getAnimal.mockRejectedValueOnce(failure)

      // Act
      let error
      try {
        await cancelCalfController.handler(request, h)
      } catch (e) {
        error = e
      }

      // Assert
      expect(error).toBe(failure)
      expect(h.view).not.toHaveBeenCalled()
    })
  })

  describe('POST', () => {
    test('it removes the calf and continues to the list of calves', async () => {
      // Arrange
      const request = { params: { cph: CPH, ...CALF } }
      const h = toolkit()

      // Act
      const result = await cancelCalfSubmitController.handler(request, h)

      // Assert
      expect(mocks.removeAnimal).toHaveBeenCalledWith(CALF)
      expect(h.redirect).toHaveBeenCalledWith(SUBMISSION_PATH)
      expect(result).toBe('redirected')
    })

    test('it rethrows a BE4FE failure, redirecting nowhere', async () => {
      // Arrange
      const request = { params: { cph: CPH, ...CALF } }
      const h = toolkit()
      const failure = new Error('503 - Service unavailable')
      mocks.removeAnimal.mockRejectedValueOnce(failure)

      // Act
      let error
      try {
        await cancelCalfSubmitController.handler(request, h)
      } catch (e) {
        error = e
      }

      // Assert
      expect(error).toBe(failure)
      expect(h.redirect).not.toHaveBeenCalled()
    })
  })
})
