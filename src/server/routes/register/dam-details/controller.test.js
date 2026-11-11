import * as registrationClient from '#server/services/registration-client.js'
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
  breed: 'AA'
}

const mocks = {
  getAnimal: vi.mocked(registrationClient.getAnimal),
  saveAnimal: vi.mocked(registrationClient.saveAnimal)
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
    mocks.getAnimal.mockResolvedValue(calfDetails)
    mocks.saveAnimal.mockResolvedValue(undefined)
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
      expect(mocks.getAnimal).toHaveBeenCalledWith(CALF)
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
      mocks.getAnimal.mockResolvedValueOnce({
        ...calfDetails,
        damType: 'surrogate'
      })

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
      mocks.getAnimal.mockResolvedValueOnce({})

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
      mocks.getAnimal.mockRejectedValueOnce(failure)

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
      expect(mocks.saveAnimal).toHaveBeenCalledWith({
        ...CALF,
        values: { ...calfDetails, damType: 'genetic' }
      })
      expect(h.redirect).toHaveBeenCalledWith(`${CALF_PATH}/genetic-dam`)
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
      expect(mocks.saveAnimal).toHaveBeenCalledWith({
        ...CALF,
        values: { ...calfDetails, damType: 'surrogate' }
      })
      expect(h.redirect).toHaveBeenCalledWith(`${CALF_PATH}/surrogate-dam`)
    })

    test('it asks for the other dam after a Change link changes the dam type, clearing the dams', async () => {
      // Arrange
      const request = {
        params: { cph: CPH, ...CALF },
        query: { return: 'check' },
        payload: { damType: 'surrogate' }
      }
      const { h } = toolkit()
      mocks.getAnimal.mockResolvedValueOnce({
        ...calfDetails,
        damType: 'genetic',
        geneticDamEarTagNumber: 'UK200000000007',
        sireEarTagNumber: '',
        sireName: ''
      })

      // Act
      await damDetailsSubmitController.handler(request, h)

      // Assert
      expect(mocks.saveAnimal).toHaveBeenCalledWith({
        ...CALF,
        values: {
          ...calfDetails,
          damType: 'surrogate',
          sireEarTagNumber: '',
          sireName: ''
        }
      })
      expect(h.redirect).toHaveBeenCalledWith(
        `${CALF_PATH}/surrogate-dam?return=check`
      )
    })

    test('it returns to check calf details after a Change link leaves the dam type as it was', async () => {
      // Arrange
      const request = {
        params: { cph: CPH, ...CALF },
        query: { return: 'check' },
        payload: { damType: 'genetic' }
      }
      const { h } = toolkit()
      mocks.getAnimal.mockResolvedValueOnce({
        ...calfDetails,
        damType: 'genetic',
        geneticDamEarTagNumber: 'UK200000000007',
        sireEarTagNumber: '',
        sireName: ''
      })

      // Act
      await damDetailsSubmitController.handler(request, h)

      // Assert
      expect(h.redirect).toHaveBeenCalledWith(`${CALF_PATH}/check-calf-details`)
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
      expect(mocks.saveAnimal).not.toHaveBeenCalled()
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
      expect(mocks.saveAnimal).not.toHaveBeenCalled()
      expect(response.code).toHaveBeenCalledWith(400)
    })

    test('it sends the user to calf details before the calf is saved, saving nothing', async () => {
      // Arrange
      const request = {
        params: { cph: CPH, ...CALF },
        payload: { damType: 'genetic' }
      }
      const { h } = toolkit()
      mocks.getAnimal.mockResolvedValueOnce({})

      // Act
      const result = await damDetailsSubmitController.handler(request, h)

      // Assert
      expect(h.redirect).toHaveBeenCalledWith(`${CALF_PATH}/calf-details`)
      expect(mocks.saveAnimal).not.toHaveBeenCalled()
      expect(result).toBe('redirected')
    })

    test('it rethrows a BE4FE failure', async () => {
      // Arrange
      const request = {
        params: { cph: CPH, ...CALF },
        payload: { damType: 'genetic' }
      }
      const { h } = toolkit()
      const failure = new Error('503 - Service unavailable')
      mocks.saveAnimal.mockRejectedValueOnce(failure)

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
