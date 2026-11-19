import * as animalClient from '#server/services/be4fe/animal.js'
import * as dataClient from '#server/services/be4fe/data.js'
import {
  geneticDamController,
  geneticDamSubmitController
} from './controller.js'

vi.mock('#server/services/be4fe/animal.js')
vi.mock('#server/services/be4fe/data.js')

const CPH = '10/081/1234'
const SUBMISSION_ID = '7ZK-M3Q-A9D'
const ANIMAL_ID = 'UK123456301550'
const CALF = { cph: CPH, submissionId: SUBMISSION_ID, animalId: ANIMAL_ID }
const TEMPLATE = 'register/genetic-dam/index'
const CALF_PATH = `/holdings/10/081/1234/cattle/register/${SUBMISSION_ID}/calves/${ANIMAL_ID}`
const DAMS = ['UK200000000007', 'UK200000000008']
const animal = {
  earTagNumber: 'UK123456301550',
  dateOfBirth: '1/11/2026',
  sex: 'female',
  breed: 'AA',
  damType: 'genetic'
}
const ERROR_TEXT = 'Enter the ear tag number of the genetic dam'

const mocks = {
  getAnimal: vi.mocked(animalClient.getAnimal),
  getDamEarTags: vi.mocked(dataClient.getDamEarTags),
  getDam: vi.mocked(dataClient.getDam),
  saveAnimal: vi.mocked(animalClient.saveAnimal)
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
    mocks.getAnimal.mockResolvedValue(animal)
    mocks.getDamEarTags.mockResolvedValue(DAMS)
    mocks.getDam.mockImplementation(async ({ earTagNumber }) => ({
      earTagNumber,
      dateOfBirth: null,
      calfDatesOfBirth: []
    }))
    mocks.saveAnimal.mockResolvedValue(undefined)
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
      expect(mocks.getAnimal).toHaveBeenCalledWith(CALF)
      expect(mocks.getDamEarTags).toHaveBeenCalledWith({ cph: CPH })
      expect(h.view).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({
          calfEarTagNumber: 'UK 123456 301550',
          values: { geneticDamEarTagNumber: '' },
          earTagItems: DAMS,
          errorList: []
        })
      )
      expect(result).toBe(response)
    })

    test('it renders the saved genetic dam', async () => {
      // Arrange
      const request = { params: { cph: CPH, ...CALF } }
      const { h } = toolkit()
      mocks.getAnimal.mockResolvedValueOnce({
        ...animal,
        geneticDamEarTagNumber: 'UK200000000007'
      })

      // Act
      await geneticDamController.handler(request, h)

      // Assert
      expect(h.view).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({
          values: { geneticDamEarTagNumber: 'UK200000000007' }
        })
      )
    })

    test.each([
      ['calf details before the calf is saved', {}, 'calf-details'],
      [
        'dam details before the dam type is chosen',
        { ...animal, damType: undefined },
        'dam-details'
      ],
      [
        'dam details for a calf born via a surrogate dam',
        { ...animal, damType: 'surrogate' },
        'dam-details'
      ]
    ])('it sends the user to %s', async (_description, saved, page) => {
      // Arrange
      const request = { params: { cph: CPH, ...CALF } }
      const { h } = toolkit()
      mocks.getAnimal.mockResolvedValueOnce(saved)

      // Act
      const result = await geneticDamController.handler(request, h)

      // Assert
      expect(h.redirect).toHaveBeenCalledWith(`${CALF_PATH}/${page}`)
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
    test("it saves the genetic dam with the calf's other answers and continues to sire details", async () => {
      // Arrange
      const request = {
        params: { cph: CPH, ...CALF },
        payload: { geneticDamEarTagNumber: 'UK200000000007' }
      }
      const { h } = toolkit()

      // Act
      const result = await geneticDamSubmitController.handler(request, h)

      // Assert
      expect(mocks.getDamEarTags).not.toHaveBeenCalled()
      expect(mocks.saveAnimal).toHaveBeenCalledWith({
        ...CALF,
        values: { ...animal, geneticDamEarTagNumber: 'UK200000000007' }
      })
      expect(h.redirect).toHaveBeenCalledWith(`${CALF_PATH}/sire-details`)
      expect(result).toBe('redirected')
    })

    test('it trims the ear tag number before saving it', async () => {
      // Arrange
      const request = {
        params: { cph: CPH, ...CALF },
        payload: { geneticDamEarTagNumber: ' UK200000000008  ' }
      }
      const { h } = toolkit()

      // Act
      await geneticDamSubmitController.handler(request, h)

      // Assert
      expect(mocks.saveAnimal).toHaveBeenCalledWith({
        ...CALF,
        values: { ...animal, geneticDamEarTagNumber: 'UK200000000008' }
      })
    })

    test("it saves the ear tag number as the holding's animal has it, however it was typed", async () => {
      // Arrange
      const request = {
        params: { cph: CPH, ...CALF },
        payload: { geneticDamEarTagNumber: 'uk 200000 000008' }
      }
      const { h } = toolkit()
      mocks.getDam.mockResolvedValueOnce({
        earTagNumber: 'UK200000000008',
        dateOfBirth: null,
        calfDatesOfBirth: []
      })

      // Act
      await geneticDamSubmitController.handler(request, h)

      // Assert
      expect(mocks.saveAnimal).toHaveBeenCalledWith({
        ...CALF,
        values: { ...animal, geneticDamEarTagNumber: 'UK200000000008' }
      })
    })

    test.each([
      ['nothing', '', ''],
      ['only spaces', '   ', '']
    ])(
      'it re-renders with the error for %s, as bad request, saving nothing',
      async (_description, posted, shown) => {
        // Arrange
        const request = {
          params: { cph: CPH, ...CALF },
          payload: { geneticDamEarTagNumber: posted }
        }
        const { h, response } = toolkit()

        // Act
        const result = await geneticDamSubmitController.handler(request, h)

        // Assert
        expect(mocks.getDamEarTags).toHaveBeenCalledTimes(1)
        expect(mocks.saveAnimal).not.toHaveBeenCalled()
        expect(h.view).toHaveBeenCalledWith(
          TEMPLATE,
          expect.objectContaining({
            pageTitle: 'Error: Genetic dam details',
            calfEarTagNumber: 'UK 123456 301550',
            values: { geneticDamEarTagNumber: shown },
            earTagItems: DAMS,
            errorList: [{ text: ERROR_TEXT, href: '#geneticDamEarTagNumber' }]
          })
        )
        expect(response.code).toHaveBeenCalledWith(400)
        expect(result).toBe(response)
      }
    )

    test("it re-renders with the error for a tag the BE4FE finds no dam for, as bad request, saving nothing, offering the holding's dams", async () => {
      // Arrange
      const request = {
        params: { cph: CPH, ...CALF },
        payload: { geneticDamEarTagNumber: 'UK999999999999' }
      }
      const { h, response } = toolkit()
      mocks.getDam.mockResolvedValueOnce(undefined)

      // Act
      const result = await geneticDamSubmitController.handler(request, h)

      // Assert
      expect(mocks.getDamEarTags).toHaveBeenCalledTimes(1)
      expect(mocks.saveAnimal).not.toHaveBeenCalled()
      expect(h.view).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({
          values: { geneticDamEarTagNumber: 'UK999999999999' },
          earTagItems: DAMS,
          errorList: [
            {
              text: 'Enter the ear tag number of a dam on this holding',
              href: '#geneticDamEarTagNumber'
            }
          ]
        })
      )
      expect(response.code).toHaveBeenCalledWith(400)
      expect(result).toBe(response)
    })

    test('it says an ear tag number is too long without looking it up or showing it again past 256 characters', async () => {
      // Arrange
      const request = {
        params: { cph: CPH, ...CALF },
        payload: { geneticDamEarTagNumber: '9'.repeat(257) }
      }
      const { h, response } = toolkit()

      // Act
      await geneticDamSubmitController.handler(request, h)

      // Assert
      expect(mocks.getDam).not.toHaveBeenCalled()
      expect(mocks.saveAnimal).not.toHaveBeenCalled()
      expect(h.view).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({
          values: { geneticDamEarTagNumber: '' },
          errorList: [
            {
              text: 'Genetic dam ear tag number must be 15 characters or fewer',
              href: '#geneticDamEarTagNumber'
            }
          ]
        })
      )
      expect(response.code).toHaveBeenCalledWith(400)
    })

    test("it looks up one of the holding's dams, and re-renders with what rules her out, saving nothing", async () => {
      // Arrange
      const request = {
        params: { cph: CPH, ...CALF },
        payload: { geneticDamEarTagNumber: 'UK200000000007' }
      }
      const { h, response } = toolkit()
      mocks.getDam.mockResolvedValueOnce({
        earTagNumber: 'UK200000000007',
        dateOfBirth: '2026-01-01',
        calfDatesOfBirth: []
      })

      // Act
      const result = await geneticDamSubmitController.handler(request, h)

      // Assert
      expect(mocks.getDam).toHaveBeenCalledWith({
        cph: CPH,
        earTagNumber: 'UK200000000007'
      })
      expect(mocks.saveAnimal).not.toHaveBeenCalled()
      expect(h.view).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({
          errorList: [
            {
              text: 'The genetic dam appears to be under 15-months old',
              href: '#geneticDamEarTagNumber'
            }
          ]
        })
      )
      expect(response.code).toHaveBeenCalledWith(400)
      expect(result).toBe(response)
    })

    test('it looks no dam up when no ear tag number is entered', async () => {
      // Arrange
      const request = {
        params: { cph: CPH, ...CALF },
        payload: { geneticDamEarTagNumber: '  ' }
      }
      const { h } = toolkit()

      // Act
      await geneticDamSubmitController.handler(request, h)

      // Assert
      expect(mocks.getDam).not.toHaveBeenCalled()
    })

    test('it sends the user to dam details for a calf born via a surrogate dam, saving nothing', async () => {
      // Arrange
      const request = {
        params: { cph: CPH, ...CALF },
        payload: { geneticDamEarTagNumber: 'UK200000000007' }
      }
      const { h } = toolkit()
      mocks.getAnimal.mockResolvedValueOnce({ ...animal, damType: 'surrogate' })

      // Act
      const result = await geneticDamSubmitController.handler(request, h)

      // Assert
      expect(h.redirect).toHaveBeenCalledWith(`${CALF_PATH}/dam-details`)
      expect(mocks.saveAnimal).not.toHaveBeenCalled()
      expect(result).toBe('redirected')
    })

    test('it rethrows a BE4FE failure when saving', async () => {
      // Arrange
      const request = {
        params: { cph: CPH, ...CALF },
        payload: { geneticDamEarTagNumber: 'UK200000000007' }
      }
      const { h } = toolkit()
      const failure = new Error('503 - Service unavailable')
      mocks.saveAnimal.mockRejectedValueOnce(failure)

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
