import * as registrationClient from '#server/services/registration-client.js'
import {
  surrogateDamController,
  surrogateDamSubmitController
} from './controller.js'

vi.mock('#server/services/registration-client.js')

const CPH = '10/081/1234'
const SUBMISSION_ID = '7ZK-M3Q-A9D'
const ANIMAL_ID = '1'
const CALF = { submissionId: SUBMISSION_ID, animalId: ANIMAL_ID }
const TEMPLATE = 'register/surrogate-dam/index'
const CALF_PATH = `/holdings/10/081/1234/cattle/register/${SUBMISSION_ID}/calves/${ANIMAL_ID}`
const DAMS = ['UK200000000007', 'UK200000000008']
const GENETIC_ERROR = {
  text: 'Enter the ear tag number of the genetic dam',
  href: '#geneticDamEarTagNumber'
}
const SURROGATE_ERROR = {
  text: 'Enter the ear tag number of the surrogate dam',
  href: '#surrogateDamEarTagNumber'
}

const animal = {
  earTagNumber: 'UK123456301550',
  dateOfBirth: '1/11/2026',
  sex: 'female',
  breed: 'AA',
  damType: 'surrogate'
}

const mocks = {
  getAnimal: vi.mocked(registrationClient.getAnimal),
  getDamEarTags: vi.mocked(registrationClient.getDamEarTags),
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

describe('surrogateDamController', () => {
  beforeAll(() => {
    mocks.getAnimal.mockResolvedValue(animal)
    mocks.getDamEarTags.mockResolvedValue(DAMS)
    mocks.saveAnimal.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    test("it renders the questions about the calf, offering the holding's dams", async () => {
      // Arrange
      const request = { params: { cph: CPH, ...CALF } }
      const { h, response } = toolkit()

      // Act
      const result = await surrogateDamController.handler(request, h)

      // Assert
      expect(mocks.getAnimal).toHaveBeenCalledWith(CALF)
      expect(mocks.getDamEarTags).toHaveBeenCalledWith({ cph: CPH })
      expect(h.view).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({
          calfEarTagNumber: 'UK 123456 301550',
          values: { geneticDamEarTagNumber: '', surrogateDamEarTagNumber: '' },
          earTagItems: DAMS,
          errorList: []
        })
      )
      expect(result).toBe(response)
    })

    test('it renders the saved answers', async () => {
      // Arrange
      const request = { params: { cph: CPH, ...CALF } }
      const { h } = toolkit()
      const saved = {
        geneticDamEarTagNumber: 'UK123456501100',
        surrogateDamEarTagNumber: 'UK200000000007'
      }
      mocks.getAnimal.mockResolvedValueOnce({ ...animal, ...saved })

      // Act
      await surrogateDamController.handler(request, h)

      // Assert
      expect(h.view).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({ values: saved })
      )
    })

    test.each([
      ['nothing saved', {}, 'calf-details'],
      ['no dam details yet', { ...animal, damType: undefined }, 'dam-details'],
      ['a genetic dam', { ...animal, damType: 'genetic' }, 'genetic-dam']
    ])(
      'it sends a calf with %s to the page it belongs on',
      async (_description, saved, page) => {
        // Arrange
        const request = { params: { cph: CPH, ...CALF } }
        const { h } = toolkit()
        mocks.getAnimal.mockResolvedValueOnce(saved)

        // Act
        const result = await surrogateDamController.handler(request, h)

        // Assert
        expect(h.redirect).toHaveBeenCalledWith(`${CALF_PATH}/${page}`)
        expect(h.view).not.toHaveBeenCalled()
        expect(result).toBe('redirected')
      }
    )

    test('it rethrows a BE4FE failure, such as an unknown submission', async () => {
      // Arrange
      const request = { params: { cph: CPH, ...CALF } }
      const { h } = toolkit()
      const failure = new Error('Request failed - 404')
      mocks.getAnimal.mockRejectedValueOnce(failure)

      // Act
      let error
      try {
        await surrogateDamController.handler(request, h)
      } catch (e) {
        error = e
      }

      // Assert
      expect(error).toBe(failure)
      expect(h.view).not.toHaveBeenCalled()
    })
  })

  describe('POST', () => {
    test('it saves both dams, trimmed, and continues to sire details', async () => {
      // Arrange
      const request = {
        params: { cph: CPH, ...CALF },
        payload: {
          geneticDamEarTagNumber: ' UK123456501100 ',
          surrogateDamEarTagNumber: 'UK200000000007  '
        }
      }
      const { h } = toolkit()

      // Act
      const result = await surrogateDamSubmitController.handler(request, h)

      // Assert
      expect(mocks.getDamEarTags).toHaveBeenCalledWith({ cph: CPH })
      expect(mocks.saveAnimal).toHaveBeenCalledWith({
        ...CALF,
        values: {
          ...animal,
          geneticDamEarTagNumber: 'UK123456501100',
          surrogateDamEarTagNumber: 'UK200000000007'
        }
      })
      expect(h.redirect).toHaveBeenCalledWith(`${CALF_PATH}/sire-details`)
      expect(result).toBe('redirected')
    })

    test.each([
      [
        'both ear tag numbers blank',
        { geneticDamEarTagNumber: '', surrogateDamEarTagNumber: '  ' },
        { geneticDamEarTagNumber: '', surrogateDamEarTagNumber: '' },
        [GENETIC_ERROR, SURROGATE_ERROR]
      ],
      [
        "a surrogate dam that is not one of the holding's dams",
        {
          geneticDamEarTagNumber: 'UK123456501100',
          surrogateDamEarTagNumber: 'UK123456601200'
        },
        {
          geneticDamEarTagNumber: 'UK123456501100',
          surrogateDamEarTagNumber: 'UK123456601200'
        },
        [SURROGATE_ERROR]
      ]
    ])(
      'it re-renders %s with the errors, as bad request, saving nothing',
      async (_description, payload, values, errorList) => {
        // Arrange
        const request = { params: { cph: CPH, ...CALF }, payload }
        const { h, response } = toolkit()

        // Act
        const result = await surrogateDamSubmitController.handler(request, h)

        // Assert
        expect(mocks.saveAnimal).not.toHaveBeenCalled()
        expect(h.view).toHaveBeenCalledWith(
          TEMPLATE,
          expect.objectContaining({
            pageTitle: 'Error: Genetic and surrogate dam details',
            calfEarTagNumber: 'UK 123456 301550',
            values,
            earTagItems: DAMS,
            errorList
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
        payload: {
          geneticDamEarTagNumber: 'UK123456501100',
          surrogateDamEarTagNumber: 'UK200000000007'
        }
      }
      const { h } = toolkit()
      const failure = new Error('503 - Service unavailable')
      mocks.saveAnimal.mockRejectedValueOnce(failure)

      // Act
      let error
      try {
        await surrogateDamSubmitController.handler(request, h)
      } catch (e) {
        error = e
      }

      // Assert
      expect(error).toBe(failure)
      expect(h.redirect).not.toHaveBeenCalled()
    })
  })
})
