import * as registrationClient from '#server/services/registration-client.js'
import {
  checkCalfDetailsController,
  checkCalfDetailsSubmitController
} from './controller.js'

vi.mock('#server/services/registration-client.js')

const CPH = '10/081/1234'
const SUBMISSION_ID = '7ZK-M3Q-A9D'
const ANIMAL_ID = 'UK123456301550'
const CALF = { submissionId: SUBMISSION_ID, animalId: ANIMAL_ID }
const TEMPLATE = 'register/check-calf-details/index'
const SUBMISSION_PATH = `/holdings/10/081/1234/cattle/register/${SUBMISSION_ID}`
const CALF_PATH = `${SUBMISSION_PATH}/calves/${ANIMAL_ID}`
const animal = {
  earTagNumber: 'UK123456301550',
  dateOfBirth: '1/11/2026',
  sex: 'female',
  breed: 'AA',
  damType: 'genetic',
  geneticDamEarTagNumber: 'UK200000000007',
  sireEarTagNumber: '',
  sireName: ''
}

const mocks = {
  getAnimal: vi.mocked(registrationClient.getAnimal),
  getUnallocatedEarTags: vi.mocked(registrationClient.getUnallocatedEarTags),
  getDamEarTags: vi.mocked(registrationClient.getDamEarTags)
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

describe('checkCalfDetailsController', () => {
  beforeAll(() => {
    vi.setSystemTime(new Date('2026-11-05T10:00:00Z'))
    mocks.getAnimal.mockResolvedValue(animal)
    mocks.getUnallocatedEarTags.mockResolvedValue([])
    mocks.getDamEarTags.mockResolvedValue(['UK200000000007'])
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  describe('GET', () => {
    test("it renders the calf's answers", async () => {
      // Arrange
      const request = { params: { cph: CPH, ...CALF } }
      const h = toolkit()

      // Act
      const result = await checkCalfDetailsController.handler(request, h)

      // Assert
      expect(mocks.getAnimal).toHaveBeenCalledWith(CALF)
      expect(h.view).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({
          calfEarTagNumber: 'UK 123456 301550',
          formAction: `${CALF_PATH}/check-calf-details`
        })
      )
      expect(result).toBe('viewed')
    })

    test.each([
      ['calf details before the calf is saved', {}, 'calf-details'],
      [
        'the genetic dam before she is given',
        { ...animal, geneticDamEarTagNumber: undefined },
        'genetic-dam'
      ],
      [
        'sire details before that page is saved',
        { ...animal, sireEarTagNumber: undefined, sireName: undefined },
        'sire-details'
      ]
    ])('it sends the user to %s', async (_description, saved, page) => {
      // Arrange
      const request = { params: { cph: CPH, ...CALF } }
      const h = toolkit()
      mocks.getAnimal.mockResolvedValueOnce(saved)

      // Act
      const result = await checkCalfDetailsController.handler(request, h)

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
        await checkCalfDetailsController.handler(request, h)
      } catch (e) {
        error = e
      }

      // Assert
      expect(error).toBe(failure)
      expect(h.view).not.toHaveBeenCalled()
    })
  })

  describe('POST', () => {
    test("it judges the calf whole against the holding's ear tags and dams, and continues to the list of calves", async () => {
      // Arrange
      const request = { params: { cph: CPH, ...CALF } }
      const h = toolkit()

      // Act
      const result = await checkCalfDetailsSubmitController.handler(request, h)

      // Assert
      expect(mocks.getUnallocatedEarTags).toHaveBeenCalledWith({
        cph: CPH,
        submissionId: SUBMISSION_ID
      })
      expect(mocks.getDamEarTags).toHaveBeenCalledWith({ cph: CPH })
      expect(h.redirect).toHaveBeenCalledWith(SUBMISSION_PATH)
      expect(result).toBe('redirected')
    })

    test('it sends the user to the page whose answer no longer holds, to return here', async () => {
      // Arrange
      const request = { params: { cph: CPH, ...CALF } }
      const h = toolkit()
      mocks.getDamEarTags.mockResolvedValueOnce([])

      // Act
      await checkCalfDetailsSubmitController.handler(request, h)

      // Assert
      expect(h.redirect).toHaveBeenCalledWith(
        `${CALF_PATH}/genetic-dam?return=check`
      )
    })

    test('it sends the user to the page not yet saved, to return here', async () => {
      // Arrange
      const request = { params: { cph: CPH, ...CALF } }
      const h = toolkit()
      mocks.getAnimal.mockResolvedValueOnce({
        ...animal,
        sireEarTagNumber: undefined,
        sireName: undefined
      })

      // Act
      await checkCalfDetailsSubmitController.handler(request, h)

      // Assert
      expect(h.redirect).toHaveBeenCalledWith(
        `${CALF_PATH}/sire-details?return=check`
      )
    })

    test('it rethrows a BE4FE failure', async () => {
      // Arrange
      const request = { params: { cph: CPH, ...CALF } }
      const h = toolkit()
      const failure = new Error('503 - Service unavailable')
      mocks.getDamEarTags.mockRejectedValueOnce(failure)

      // Act
      let error
      try {
        await checkCalfDetailsSubmitController.handler(request, h)
      } catch (e) {
        error = e
      }

      // Assert
      expect(error).toBe(failure)
      expect(h.redirect).not.toHaveBeenCalled()
    })
  })
})
