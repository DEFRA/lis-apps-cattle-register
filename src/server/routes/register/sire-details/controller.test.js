import * as registrationClient from '#server/services/registration-client.js'
import {
  sireDetailsController,
  sireDetailsSubmitController
} from './controller.js'

vi.mock('#server/services/registration-client.js')

const CPH = '10/081/1234'
const SUBMISSION_ID = '7ZK-M3Q-A9D'
const ANIMAL_ID = 'UK123456301550'
const CALF = { submissionId: SUBMISSION_ID, animalId: ANIMAL_ID }
const TEMPLATE = 'register/sire-details/index'
const CALF_PATH = `/holdings/10/081/1234/cattle/register/${SUBMISSION_ID}/calves/${ANIMAL_ID}`
const animal = {
  earTagNumber: 'UK123456301550',
  dateOfBirth: '1/11/2026',
  sex: 'female',
  breed: 'AA',
  damType: 'genetic',
  geneticDamEarTagNumber: 'UK200000000007'
}

const mocks = {
  getAnimal: vi.mocked(registrationClient.getAnimal),
  saveAnimal: vi.mocked(registrationClient.saveAnimal)
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

describe('sireDetailsController', () => {
  beforeAll(() => {
    mocks.getAnimal.mockResolvedValue(animal)
    mocks.saveAnimal.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    test('it renders the questions about the calf, unanswered, going back to its dam page', async () => {
      // Arrange
      const request = { params: { cph: CPH, ...CALF } }
      const h = toolkit()

      // Act
      const result = await sireDetailsController.handler(request, h)

      // Assert
      expect(mocks.getAnimal).toHaveBeenCalledWith(CALF)
      expect(h.view).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({
          calfEarTagNumber: 'UK 123456 301550',
          backLinkHref: `${CALF_PATH}/genetic-dam`,
          values: { sireEarTagNumber: '', sireName: '' }
        })
      )
      expect(result).toBe('viewed')
    })

    test('it renders the saved answers, going back to the surrogate dam page for a calf born via one', async () => {
      // Arrange
      const request = { params: { cph: CPH, ...CALF } }
      const h = toolkit()
      mocks.getAnimal.mockResolvedValueOnce({
        ...animal,
        damType: 'surrogate',
        surrogateDamEarTagNumber: 'UK200000000008',
        sireEarTagNumber: 'UK123456701300',
        sireName: 'Duke'
      })

      // Act
      await sireDetailsController.handler(request, h)

      // Assert
      expect(h.view).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({
          backLinkHref: `${CALF_PATH}/surrogate-dam`,
          values: { sireEarTagNumber: 'UK123456701300', sireName: 'Duke' }
        })
      )
    })

    test.each([
      ['calf details before the calf is saved', {}, 'calf-details'],
      [
        'dam details before the dam type is chosen',
        { ...animal, damType: undefined, geneticDamEarTagNumber: undefined },
        'dam-details'
      ],
      [
        'the genetic dam before she is given',
        { ...animal, geneticDamEarTagNumber: undefined },
        'genetic-dam'
      ],
      [
        'the surrogate dam before she is given',
        { ...animal, damType: 'surrogate', geneticDamEarTagNumber: undefined },
        'surrogate-dam'
      ]
    ])('it sends the user to %s', async (_description, saved, page) => {
      // Arrange
      const request = { params: { cph: CPH, ...CALF } }
      const h = toolkit()
      mocks.getAnimal.mockResolvedValueOnce(saved)

      // Act
      const result = await sireDetailsController.handler(request, h)

      // Assert
      expect(h.redirect).toHaveBeenCalledWith(`${CALF_PATH}/${page}`)
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
        await sireDetailsController.handler(request, h)
      } catch (e) {
        error = e
      }

      // Assert
      expect(error).toBe(failure)
      expect(h.view).not.toHaveBeenCalled()
    })
  })

  describe('POST', () => {
    test("it saves the sire, trimmed, with the calf's other answers and continues to check calf details", async () => {
      // Arrange
      const request = {
        params: { cph: CPH, ...CALF },
        payload: { sireEarTagNumber: ' UK123456701300 ', sireName: 'Duke  ' }
      }
      const h = toolkit()

      // Act
      const result = await sireDetailsSubmitController.handler(request, h)

      // Assert
      expect(mocks.saveAnimal).toHaveBeenCalledWith({
        ...CALF,
        values: {
          ...animal,
          sireEarTagNumber: 'UK123456701300',
          sireName: 'Duke'
        }
      })
      expect(h.redirect).toHaveBeenCalledWith(`${CALF_PATH}/check-calf-details`)
      expect(result).toBe('redirected')
    })

    test('it saves blank answers, so the step counts as done', async () => {
      // Arrange
      const request = {
        params: { cph: CPH, ...CALF },
        payload: { sireEarTagNumber: '', sireName: '' }
      }
      const h = toolkit()

      // Act
      await sireDetailsSubmitController.handler(request, h)

      // Assert
      expect(mocks.saveAnimal).toHaveBeenCalledWith({
        ...CALF,
        values: { ...animal, sireEarTagNumber: '', sireName: '' }
      })
    })

    test('it sends the user to the dam page before the dam is given, saving nothing', async () => {
      // Arrange
      const request = {
        params: { cph: CPH, ...CALF },
        payload: { sireEarTagNumber: '', sireName: 'Duke' }
      }
      const h = toolkit()
      mocks.getAnimal.mockResolvedValueOnce({
        ...animal,
        geneticDamEarTagNumber: undefined
      })

      // Act
      const result = await sireDetailsSubmitController.handler(request, h)

      // Assert
      expect(h.redirect).toHaveBeenCalledWith(`${CALF_PATH}/genetic-dam`)
      expect(mocks.saveAnimal).not.toHaveBeenCalled()
      expect(result).toBe('redirected')
    })

    test('it rethrows a BE4FE failure when saving', async () => {
      // Arrange
      const request = {
        params: { cph: CPH, ...CALF },
        payload: { sireEarTagNumber: '', sireName: '' }
      }
      const h = toolkit()
      const failure = new Error('503 - Service unavailable')
      mocks.saveAnimal.mockRejectedValueOnce(failure)

      // Act
      let error
      try {
        await sireDetailsSubmitController.handler(request, h)
      } catch (e) {
        error = e
      }

      // Assert
      expect(error).toBe(failure)
      expect(h.redirect).not.toHaveBeenCalled()
    })
  })
})
