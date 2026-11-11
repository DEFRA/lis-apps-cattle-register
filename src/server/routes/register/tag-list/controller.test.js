import * as registrationClient from '#server/services/registration-client.js'
import { tagListController, tagListSubmitController } from './controller.js'

vi.mock('#server/services/registration-client.js')

const CPH = '10/081/1234'
const SUBMISSION_ID = '7ZK-M3Q-A9D'
const SUBMISSION = { cph: CPH, submissionId: SUBMISSION_ID }
const TEMPLATE = 'register/tag-list/index'
const SUBMISSION_PATH = `/holdings/10/081/1234/cattle/register/${SUBMISSION_ID}`
const complete = {
  earTagNumber: 'UK123456301550',
  dateOfBirth: '1/11/2026',
  sex: 'female',
  breed: 'AA',
  damType: 'genetic',
  geneticDamEarTagNumber: 'UK200000000007',
  sireEarTagNumber: '',
  sireName: ''
}
const unfinished = {
  earTagNumber: 'UK123456301551',
  dateOfBirth: '1/11/2026',
  sex: 'male',
  breed: 'AA'
}

const mocks = {
  getSubmission: vi.mocked(registrationClient.getSubmission),
  getAnimal: vi.mocked(registrationClient.getAnimal),
  getUnallocatedEarTags: vi.mocked(registrationClient.getUnallocatedEarTags),
  getDamEarTags: vi.mocked(registrationClient.getDamEarTags)
}

/**
 * @param {Record<string, string>[]} animals - the submission's calves, in
 *   order, numbered from 1
 */
function givenCalves(animals) {
  mocks.getSubmission.mockResolvedValueOnce({
    submissionId: SUBMISSION_ID,
    cph: CPH,
    status: 'DRAFT',
    animals: animals.map(({ earTagNumber }, index) => ({
      animalId: String(index + 1),
      earTagNumber
    }))
  })
  animals.forEach((animal) => mocks.getAnimal.mockResolvedValueOnce(animal))
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

describe('tagListController', () => {
  beforeAll(() => {
    vi.setSystemTime(new Date('2026-11-05T10:00:00Z'))
    mocks.getUnallocatedEarTags.mockResolvedValue([])
    mocks.getDamEarTags.mockResolvedValue(['UK200000000007'])
  })

  afterEach(() => {
    vi.resetAllMocks()
    mocks.getUnallocatedEarTags.mockResolvedValue([])
    mocks.getDamEarTags.mockResolvedValue(['UK200000000007'])
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  describe('GET', () => {
    test("it lists the calves, judged against the holding's ear tags and dams", async () => {
      // Arrange
      const request = { params: SUBMISSION }
      const { h, response } = toolkit()
      givenCalves([complete, unfinished])

      // Act
      const result = await tagListController.handler(request, h)

      // Assert
      expect(mocks.getSubmission).toHaveBeenCalledWith({
        submissionId: SUBMISSION_ID
      })
      expect(mocks.getUnallocatedEarTags).toHaveBeenCalledWith(SUBMISSION)
      expect(mocks.getDamEarTags).toHaveBeenCalledWith({ cph: CPH })
      expect(mocks.getAnimal).toHaveBeenCalledWith({
        submissionId: SUBMISSION_ID,
        animalId: '2'
      })
      expect(h.view).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({
          calves: [
            {
              id: 'calf-1',
              earTagNumber: 'UK 123456 301550',
              href: `${SUBMISSION_PATH}/calves/1/check-calf-details`,
              isReady: true
            },
            {
              id: 'calf-2',
              earTagNumber: 'UK 123456 301551',
              href: `${SUBMISSION_PATH}/calves/2/dam-details`,
              isReady: false
            }
          ],
          errorList: []
        })
      )
      expect(result).toBe(response)
    })

    test('it lists a calf whose dam has left the holding as not ready, linking to that page', async () => {
      // Arrange
      const request = { params: SUBMISSION }
      const { h } = toolkit()
      givenCalves([complete])
      mocks.getDamEarTags.mockResolvedValue([])

      // Act
      await tagListController.handler(request, h)

      // Assert
      expect(h.view).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({
          calves: [
            expect.objectContaining({
              href: `${SUBMISSION_PATH}/calves/1/genetic-dam`,
              isReady: false
            })
          ]
        })
      )
    })

    test('it lists no calves for a registration left with none', async () => {
      // Arrange
      const request = { params: SUBMISSION }
      const { h } = toolkit()
      givenCalves([])

      // Act
      await tagListController.handler(request, h)

      // Assert
      expect(h.view).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({
          calves: [],
          backLinkHref: `${SUBMISSION_PATH}/calves/1/calf-details`
        })
      )
    })

    test('it rethrows a BE4FE failure, such as an unknown submission', async () => {
      // Arrange
      const request = { params: SUBMISSION }
      const { h } = toolkit()
      const failure = new Error('Request failed - 404')
      mocks.getSubmission.mockRejectedValueOnce(failure)

      // Act
      let error
      try {
        await tagListController.handler(request, h)
      } catch (e) {
        error = e
      }

      // Assert
      expect(error).toBe(failure)
      expect(h.view).not.toHaveBeenCalled()
    })
  })

  describe('POST', () => {
    test('it starts the next calf when more animals are to be added', async () => {
      // Arrange
      const request = { params: SUBMISSION, payload: { addAnother: 'yes' } }
      const { h } = toolkit()
      givenCalves([complete, unfinished])

      // Act
      const result = await tagListSubmitController.handler(request, h)

      // Assert
      expect(h.redirect).toHaveBeenCalledWith(
        `${SUBMISSION_PATH}/calves/3/calf-details`
      )
      expect(result).toBe('redirected')
    })

    test('it continues to sending the registration when every calf is ready', async () => {
      // Arrange
      const request = { params: SUBMISSION, payload: { addAnother: 'no' } }
      const { h } = toolkit()
      givenCalves([complete])

      // Act
      await tagListSubmitController.handler(request, h)

      // Assert
      expect(h.redirect).toHaveBeenCalledWith(`${SUBMISSION_PATH}/submit`)
    })

    test.each([
      [
        'no answer',
        '',
        [complete],
        {
          text: 'Select yes to add additional animals or no to continue',
          href: '#addAnother'
        }
      ],
      [
        'no more animals with none in the registration',
        'no',
        [],
        {
          text: 'Add at least one animal before continuing',
          href: '#addAnother'
        }
      ],
      [
        'no more animals while a calf is unfinished',
        'no',
        [complete, unfinished],
        {
          text: 'Complete all required animal details before continuing',
          href: '#calf-2'
        }
      ],
      [
        'another animal beyond the limit',
        'yes',
        Array.from({ length: 50 }, () => unfinished),
        {
          text: 'You can add up to 50 animals to one registration. Select no to continue',
          href: '#addAnother'
        }
      ]
    ])(
      'it re-renders %s with the error, as bad request',
      async (_description, addAnother, animals, error) => {
        // Arrange
        const request = { params: SUBMISSION, payload: { addAnother } }
        const { h, response } = toolkit()
        givenCalves(animals)

        // Act
        const result = await tagListSubmitController.handler(request, h)

        // Assert
        expect(h.redirect).not.toHaveBeenCalled()
        expect(h.view).toHaveBeenCalledWith(
          TEMPLATE,
          expect.objectContaining({
            pageTitle: 'Error: Register new cattle births',
            values: { addAnother },
            errorList: [error]
          })
        )
        expect(response.code).toHaveBeenCalledWith(400)
        expect(result).toBe(response)
      }
    )

    test('it starts the first calf again for a registration left with none', async () => {
      // Arrange
      const request = { params: SUBMISSION, payload: { addAnother: 'yes' } }
      const { h } = toolkit()
      givenCalves([])

      // Act
      await tagListSubmitController.handler(request, h)

      // Assert
      expect(h.redirect).toHaveBeenCalledWith(
        `${SUBMISSION_PATH}/calves/1/calf-details`
      )
    })

    test('it numbers the next calf after the highest there is, not the count', async () => {
      // Arrange
      const request = { params: SUBMISSION, payload: { addAnother: 'yes' } }
      const { h } = toolkit()
      mocks.getSubmission.mockResolvedValueOnce({
        submissionId: SUBMISSION_ID,
        cph: CPH,
        status: 'DRAFT',
        animals: [{ animalId: '3', earTagNumber: complete.earTagNumber }]
      })
      mocks.getAnimal.mockResolvedValueOnce(complete)

      // Act
      await tagListSubmitController.handler(request, h)

      // Assert
      expect(h.redirect).toHaveBeenCalledWith(
        `${SUBMISSION_PATH}/calves/4/calf-details`
      )
    })
  })
})
