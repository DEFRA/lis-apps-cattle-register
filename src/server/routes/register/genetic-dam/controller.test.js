import { registrationClient } from '#server/services/registration-client.js'
import {
  geneticDamController,
  geneticDamSubmitController
} from './controller.js'

vi.mock('#server/services/registration-client.js')

const CPH = '10/081/1234'
const SUBMISSION_ID = '7ZK-M3Q-A9D'
const ANIMAL_ID = '1'
const CALF = { submissionId: SUBMISSION_ID, animalId: ANIMAL_ID }
const TEMPLATE = 'register/genetic-dam/index'
const CALF_PATH = `/holdings/10/081/1234/cattle/register/${SUBMISSION_ID}/calves/${ANIMAL_ID}`
const DAMS = ['UK200000000007', 'UK200000000008']
const ERROR_TEXT = 'Enter the ear tag number of the genetic dam'

const mocks = {
  getCalfDetails: vi.mocked(registrationClient.getCalfDetails),
  getDamDetails: vi.mocked(registrationClient.getDamDetails),
  getGeneticDam: vi.mocked(registrationClient.getGeneticDam),
  getDamEarTags: vi.mocked(registrationClient.getDamEarTags),
  saveGeneticDam: vi.mocked(registrationClient.saveGeneticDam)
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

describe('geneticDamController', () => {
  beforeAll(() => {
    mocks.getCalfDetails.mockResolvedValue({ earTagNumber: 'UK123456301550' })
    mocks.getDamDetails.mockResolvedValue({ damType: 'genetic' })
    mocks.getGeneticDam.mockResolvedValue({})
    mocks.getDamEarTags.mockResolvedValue(DAMS)
    mocks.saveGeneticDam.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    test("it renders the question about the calf, offering the holding's dams", async () => {
      // Arrange
      const request = { params: { cph: CPH, ...CALF } }
      const { h, response } = toolkit()

      // Act
      const result = await geneticDamController.handler(request, h)

      // Assert
      expect(mocks.getCalfDetails).toHaveBeenCalledWith(CALF)
      expect(mocks.getDamDetails).toHaveBeenCalledWith(CALF)
      expect(mocks.getGeneticDam).toHaveBeenCalledWith(CALF)
      expect(mocks.getDamEarTags).toHaveBeenCalledWith({ cph: CPH })
      expect(h.view).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({
          calfEarTagNumber: 'UK 123456 301550',
          values: { earTagNumber: '' },
          earTagItems: DAMS,
          errorList: []
        })
      )
      expect(result).toBe(response)
    })

    test('it renders the saved answer', async () => {
      // Arrange
      const request = { params: { cph: CPH, ...CALF } }
      const { h } = toolkit()
      mocks.getGeneticDam.mockResolvedValueOnce({
        earTagNumber: 'UK200000000007'
      })

      // Act
      await geneticDamController.handler(request, h)

      // Assert
      expect(h.view).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({ values: { earTagNumber: 'UK200000000007' } })
      )
    })

    test.each([
      ['a surrogate dam', { damType: 'surrogate' }],
      ['no dam details yet', {}]
    ])(
      'it sends a calf with %s back to dam details',
      async (_description, damDetails) => {
        // Arrange
        const request = { params: { cph: CPH, ...CALF } }
        const { h } = toolkit()
        mocks.getDamDetails.mockResolvedValueOnce(damDetails)

        // Act
        const result = await geneticDamController.handler(request, h)

        // Assert
        expect(h.redirect).toHaveBeenCalledWith(`${CALF_PATH}/dam-details`)
        expect(h.view).not.toHaveBeenCalled()
        expect(result).toBe('redirected')
      }
    )

    test('it rethrows a BE4FE failure, such as an unknown submission', async () => {
      // Arrange
      const request = { params: { cph: CPH, ...CALF } }
      const { h } = toolkit()
      const failure = new Error('Request failed - 404')
      mocks.getGeneticDam.mockRejectedValueOnce(failure)

      // Act
      let error
      try {
        await geneticDamController.handler(request, h)
      } catch (e) {
        error = e
      }

      // Assert
      expect(error).toBe(failure)
      expect(h.view).not.toHaveBeenCalled()
    })
  })

  describe('POST', () => {
    test('it saves the genetic dam and continues to sire details', async () => {
      // Arrange
      const request = {
        params: { cph: CPH, ...CALF },
        payload: { earTagNumber: 'UK200000000007' }
      }
      const { h } = toolkit()

      // Act
      const result = await geneticDamSubmitController.handler(request, h)

      // Assert
      expect(mocks.getDamEarTags).toHaveBeenCalledWith({ cph: CPH })
      expect(mocks.saveGeneticDam).toHaveBeenCalledWith({
        ...CALF,
        answers: { earTagNumber: 'UK200000000007' }
      })
      expect(h.redirect).toHaveBeenCalledWith(`${CALF_PATH}/sire-details`)
      expect(mocks.getCalfDetails).not.toHaveBeenCalled()
      expect(result).toBe('redirected')
    })

    test('it trims the ear tag number before saving it', async () => {
      // Arrange
      const request = {
        params: { cph: CPH, ...CALF },
        payload: { earTagNumber: ' UK200000000008  ' }
      }
      const { h } = toolkit()

      // Act
      await geneticDamSubmitController.handler(request, h)

      // Assert
      expect(mocks.saveGeneticDam).toHaveBeenCalledWith({
        ...CALF,
        answers: { earTagNumber: 'UK200000000008' }
      })
    })

    test.each([
      ['a blank ear tag number', '   ', ''],
      [
        "an ear tag number that is not one of the holding's dams",
        'UK123456501100',
        'UK123456501100'
      ]
    ])(
      'it re-renders %s with the error, as bad request, saving nothing',
      async (_description, posted, shown) => {
        // Arrange
        const request = {
          params: { cph: CPH, ...CALF },
          payload: { earTagNumber: posted }
        }
        const { h, response } = toolkit()

        // Act
        const result = await geneticDamSubmitController.handler(request, h)

        // Assert
        expect(mocks.saveGeneticDam).not.toHaveBeenCalled()
        expect(mocks.getCalfDetails).toHaveBeenCalledWith(CALF)
        expect(h.view).toHaveBeenCalledWith(
          TEMPLATE,
          expect.objectContaining({
            pageTitle: 'Error: Genetic dam details',
            calfEarTagNumber: 'UK 123456 301550',
            values: { earTagNumber: shown },
            earTagItems: DAMS,
            errorList: [{ text: ERROR_TEXT, href: '#earTagNumber' }]
          })
        )
        expect(response.code).toHaveBeenCalledWith(400)
        expect(result).toBe(response)
      }
    )

    test('it rethrows a BE4FE failure when saving', async () => {
      // Arrange
      const request = {
        params: { cph: CPH, ...CALF },
        payload: { earTagNumber: 'UK200000000007' }
      }
      const { h } = toolkit()
      const failure = new Error('503 - Service unavailable')
      mocks.saveGeneticDam.mockRejectedValueOnce(failure)

      // Act
      let error
      try {
        await geneticDamSubmitController.handler(request, h)
      } catch (e) {
        error = e
      }

      // Assert
      expect(error).toBe(failure)
      expect(h.redirect).not.toHaveBeenCalled()
    })
  })
})
