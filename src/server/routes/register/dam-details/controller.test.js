import { registrationClient } from '#server/services/registration-client.js'
import {
  damDetailsController,
  damDetailsSubmitController
} from './controller.js'

vi.mock('#server/services/registration-client.js')

const CPH = '10/081/1234'
const SUBMISSION_ID = '7ZK-M3Q-A9D'
const ANIMAL_ID = '1'
const CALF = { submissionId: SUBMISSION_ID, animalId: ANIMAL_ID }
const TEMPLATE = 'register/dam-details/index'
const CALF_PATH = `/holdings/10/081/1234/cattle/register/${SUBMISSION_ID}/calves/${ANIMAL_ID}`
const calfDetails = {
  earTagNumber: 'UK123456301550',
  dateOfBirth: '1/11/2026',
  sex: 'female',
  breed: 'Aberdeen Angus (AA)'
}

const mocks = {
  getCalfDetails: vi.mocked(registrationClient.getCalfDetails),
  getDamDetails: vi.mocked(registrationClient.getDamDetails),
  saveDamDetails: vi.mocked(registrationClient.saveDamDetails)
}

/**
 * @returns {{ h: object, response: object }} a response toolkit whose view
 *   responses record the status code set on them
 */
function toolkit() {
  const response = { code: vi.fn() }
  response.code.mockReturnValue(response)
  const h = {
    view: vi.fn().mockReturnValue(response),
    redirect: vi.fn().mockReturnValue('redirected')
  }
  return { h, response }
}

describe('damDetailsController', () => {
  beforeAll(() => {
    mocks.getCalfDetails.mockResolvedValue(calfDetails)
    mocks.getDamDetails.mockResolvedValue({})
    mocks.saveDamDetails.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    test('it renders the question about the calf, unanswered', async () => {
      // Arrange
      const request = { params: { cph: CPH, ...CALF } }
      const { h } = toolkit()

      // Act
      await damDetailsController.handler(request, h)

      // Assert
      expect(mocks.getCalfDetails).toHaveBeenCalledWith(CALF)
      expect(mocks.getDamDetails).toHaveBeenCalledWith(CALF)
      expect(h.view).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({
          calfEarTagNumber: 'UK 123456 301550',
          values: { damType: '' },
          errorList: []
        })
      )
    })

    test('it renders the saved answer', async () => {
      // Arrange
      const request = { params: { cph: CPH, ...CALF } }
      const { h } = toolkit()
      mocks.getDamDetails.mockResolvedValueOnce({ damType: 'surrogate' })

      // Act
      await damDetailsController.handler(request, h)

      // Assert
      expect(h.view).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({ values: { damType: 'surrogate' } })
      )
    })

    test('it sends the user to calf details before the calf is saved', async () => {
      // Arrange
      const request = { params: { cph: CPH, ...CALF } }
      const { h } = toolkit()
      mocks.getCalfDetails.mockResolvedValueOnce({})

      // Act
      const result = await damDetailsController.handler(request, h)

      // Assert
      expect(h.redirect).toHaveBeenCalledWith(`${CALF_PATH}/calf-details`)
      expect(h.view).not.toHaveBeenCalled()
      expect(result).toBe('redirected')
    })

    test('it rethrows a BE4FE failure, such as an unknown submission', async () => {
      // Arrange
      const request = { params: { cph: CPH, ...CALF } }
      const { h } = toolkit()
      const failure = new Error('Request failed - 404')
      mocks.getCalfDetails.mockRejectedValueOnce(failure)

      // Act
      let error
      try {
        await damDetailsController.handler(request, h)
      } catch (e) {
        error = e
      }

      // Assert
      expect(error).toBe(failure)
      expect(h.view).not.toHaveBeenCalled()
    })
  })

  describe('POST', () => {
    test('it saves a genetic dam and continues to the genetic dam page', async () => {
      // Arrange
      const request = {
        params: { cph: CPH, ...CALF },
        payload: { damType: 'genetic' }
      }
      const { h } = toolkit()

      // Act
      const result = await damDetailsSubmitController.handler(request, h)

      // Assert
      expect(mocks.saveDamDetails).toHaveBeenCalledWith({
        ...CALF,
        answers: { damType: 'genetic' }
      })
      expect(h.redirect).toHaveBeenCalledWith(`${CALF_PATH}/genetic-dam`)
      expect(mocks.getCalfDetails).not.toHaveBeenCalled()
      expect(result).toBe('redirected')
    })

    test('it saves a surrogate dam and continues to the surrogate dam page', async () => {
      // Arrange
      const request = {
        params: { cph: CPH, ...CALF },
        payload: { damType: 'surrogate' }
      }
      const { h } = toolkit()

      // Act
      await damDetailsSubmitController.handler(request, h)

      // Assert
      expect(mocks.saveDamDetails).toHaveBeenCalledWith({
        ...CALF,
        answers: { damType: 'surrogate' }
      })
      expect(h.redirect).toHaveBeenCalledWith(`${CALF_PATH}/surrogate-dam`)
    })

    test('it re-renders with the error, as bad request, saving nothing', async () => {
      // Arrange
      const request = {
        params: { cph: CPH, ...CALF },
        payload: { damType: '' }
      }
      const { h, response } = toolkit()

      // Act
      const result = await damDetailsSubmitController.handler(request, h)

      // Assert
      expect(mocks.saveDamDetails).not.toHaveBeenCalled()
      expect(h.view).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({
          pageTitle: 'Error: Dam details',
          calfEarTagNumber: 'UK 123456 301550',
          values: { damType: '' },
          errorList: [
            {
              text: 'Select if the calf was born via a genetic or surrogate dam',
              href: '#damType'
            }
          ]
        })
      )
      expect(response.code).toHaveBeenCalledWith(400)
      expect(result).toBe(response)
    })

    test('it rejects an answer that is not an option', async () => {
      // Arrange
      const request = {
        params: { cph: CPH, ...CALF },
        payload: { damType: 'clone' }
      }
      const { h, response } = toolkit()

      // Act
      await damDetailsSubmitController.handler(request, h)

      // Assert
      expect(mocks.saveDamDetails).not.toHaveBeenCalled()
      expect(response.code).toHaveBeenCalledWith(400)
    })

    test('it rethrows a BE4FE failure', async () => {
      // Arrange
      const request = {
        params: { cph: CPH, ...CALF },
        payload: { damType: 'genetic' }
      }
      const { h } = toolkit()
      const failure = new Error('503 - Service unavailable')
      mocks.saveDamDetails.mockRejectedValueOnce(failure)

      // Act
      let error
      try {
        await damDetailsSubmitController.handler(request, h)
      } catch (e) {
        error = e
      }

      // Assert
      expect(error).toBe(failure)
      expect(h.redirect).not.toHaveBeenCalled()
    })
  })
})
