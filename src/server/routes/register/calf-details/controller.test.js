import { registrationClient } from '#server/services/registration-client.js'
import {
  calfDetailsController,
  calfDetailsSubmitController
} from './controller.js'

vi.mock('#server/services/registration-client.js')

const CPH = '10/081/1234'
const SUBMISSION_ID = '7ZK-M3Q-A9D'
const TEMPLATE = 'register/calf-details/index'
const START_PATH = '/holdings/10/081/1234/cattle/register'
const today = new Date()
const TODAY = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`
const DAYS_LATE = 40
const DAY_MS = 86_400_000
const late = new Date(today.getTime() - DAYS_LATE * DAY_MS)
const LATE_DATE = `${late.getDate()}/${late.getMonth() + 1}/${late.getFullYear()}`

const validAnswers = {
  earTagNumber: 'UK123456301550',
  dateOfBirth: TODAY,
  sex: 'female',
  breed: 'Aberdeen Angus (AA)'
}

const mocks = {
  getCalfDetails: vi.mocked(registrationClient.getCalfDetails),
  saveCalfDetails: vi.mocked(registrationClient.saveCalfDetails),
  getUnallocatedEarTags: vi.mocked(registrationClient.getUnallocatedEarTags)
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

describe('calfDetailsController', () => {
  beforeAll(() => {
    mocks.saveCalfDetails.mockResolvedValue(true)
    mocks.getUnallocatedEarTags.mockResolvedValue([])
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    test('it renders the saved answers', async () => {
      // Arrange
      const request = { params: { cph: CPH, submissionId: SUBMISSION_ID } }
      const { h } = toolkit()
      mocks.getCalfDetails.mockResolvedValueOnce({ answers: validAnswers })

      // Act
      await calfDetailsController.handler(request, h)

      // Assert
      expect(mocks.getCalfDetails).toHaveBeenCalledWith({
        cph: CPH,
        submissionId: SUBMISSION_ID
      })
      expect(h.view).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({ values: validAnswers, errorList: [] })
      )
    })

    test('it renders blank answers before the calf is saved', async () => {
      // Arrange
      const request = { params: { cph: CPH, submissionId: SUBMISSION_ID } }
      const { h } = toolkit()
      mocks.getCalfDetails.mockResolvedValueOnce({ answers: {} })

      // Act
      await calfDetailsController.handler(request, h)

      // Assert
      expect(h.view).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({
          values: { earTagNumber: '', dateOfBirth: '', sex: '', breed: '' }
        })
      )
    })

    test("it offers the holding's unallocated ear tags", async () => {
      // Arrange
      const request = { params: { cph: CPH, submissionId: SUBMISSION_ID } }
      const { h } = toolkit()
      mocks.getCalfDetails.mockResolvedValueOnce({ answers: {} })
      mocks.getUnallocatedEarTags.mockResolvedValueOnce([
        'UK324537100001',
        'UK324537100002'
      ])

      // Act
      await calfDetailsController.handler(request, h)

      // Assert
      expect(mocks.getUnallocatedEarTags).toHaveBeenCalledWith({
        cph: CPH,
        submissionId: SUBMISSION_ID
      })
      expect(h.view).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({
          earTagItems: ['UK324537100001', 'UK324537100002']
        })
      )
    })

    test("it starts over when the submission is not the holding's", async () => {
      // Arrange
      const request = { params: { cph: CPH, submissionId: SUBMISSION_ID } }
      const { h } = toolkit()
      mocks.getCalfDetails.mockResolvedValueOnce(null)

      // Act
      const result = await calfDetailsController.handler(request, h)

      // Assert
      expect(h.redirect).toHaveBeenCalledWith(START_PATH)
      expect(h.view).not.toHaveBeenCalled()
      expect(mocks.getUnallocatedEarTags).not.toHaveBeenCalled()
      expect(result).toBe('redirected')
    })
  })

  describe('POST', () => {
    test('it saves the answers and continues to dam details', async () => {
      // Arrange
      const request = {
        params: { cph: CPH, submissionId: SUBMISSION_ID },
        payload: { ...validAnswers, acknowledgedLateDateOfBirth: '' }
      }
      const { h } = toolkit()

      // Act
      const result = await calfDetailsSubmitController.handler(request, h)

      // Assert
      expect(mocks.saveCalfDetails).toHaveBeenCalledWith({
        cph: CPH,
        submissionId: SUBMISSION_ID,
        answers: validAnswers
      })
      expect(h.redirect).toHaveBeenCalledWith(
        `${START_PATH}/${SUBMISSION_ID}/dam-details`
      )
      expect(mocks.getUnallocatedEarTags).not.toHaveBeenCalled()
      expect(result).toBe('redirected')
    })

    test('it trims the answers before validating and saving them', async () => {
      // Arrange
      const request = {
        params: { cph: CPH, submissionId: SUBMISSION_ID },
        payload: {
          ...validAnswers,
          earTagNumber: '  UK123456301550 ',
          acknowledgedLateDateOfBirth: ''
        }
      }
      const { h } = toolkit()

      // Act
      await calfDetailsSubmitController.handler(request, h)

      // Assert
      expect(mocks.saveCalfDetails).toHaveBeenCalledWith({
        cph: CPH,
        submissionId: SUBMISSION_ID,
        answers: validAnswers
      })
    })

    test('it re-renders with the errors, as bad request, saving nothing', async () => {
      // Arrange
      const request = {
        params: { cph: CPH, submissionId: SUBMISSION_ID },
        payload: {
          earTagNumber: '',
          dateOfBirth: '',
          sex: '',
          breed: '',
          acknowledgedLateDateOfBirth: ''
        }
      }
      const { h, response } = toolkit()

      // Act
      const result = await calfDetailsSubmitController.handler(request, h)

      // Assert
      expect(mocks.saveCalfDetails).not.toHaveBeenCalled()
      expect(h.view).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({
          pageTitle: 'Error: Calf details',
          errorList: [
            { text: 'Enter the animal ear tag number', href: '#earTagNumber' },
            {
              text: 'Enter the date the animal was born',
              href: '#dateOfBirth'
            },
            { text: 'Select if the animal is male or female', href: '#sex' },
            {
              text: 'Enter the animal breed or breed code into the text box and select the correct one from the suggested options',
              href: '#breed'
            }
          ]
        })
      )
      expect(response.code).toHaveBeenCalledWith(400)
      expect(result).toBe(response)
    })

    test('it offers the unallocated ear tags again with the errors', async () => {
      // Arrange
      const request = {
        params: { cph: CPH, submissionId: SUBMISSION_ID },
        payload: {
          ...validAnswers,
          earTagNumber: '',
          acknowledgedLateDateOfBirth: ''
        }
      }
      const { h } = toolkit()
      mocks.getUnallocatedEarTags.mockResolvedValueOnce(['UK324537100001'])

      // Act
      await calfDetailsSubmitController.handler(request, h)

      // Assert
      expect(mocks.getUnallocatedEarTags).toHaveBeenCalledWith({
        cph: CPH,
        submissionId: SUBMISSION_ID
      })
      expect(h.view).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({ earTagItems: ['UK324537100001'] })
      )
    })

    test('it warns once about a late date of birth, saving nothing', async () => {
      // Arrange
      const request = {
        params: { cph: CPH, submissionId: SUBMISSION_ID },
        payload: {
          ...validAnswers,
          dateOfBirth: LATE_DATE,
          acknowledgedLateDateOfBirth: ''
        }
      }
      const { h, response } = toolkit()

      // Act
      await calfDetailsSubmitController.handler(request, h)

      // Assert
      expect(mocks.saveCalfDetails).not.toHaveBeenCalled()
      expect(h.view).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({
          errorList: [],
          warnings: [
            'Date of birth is over the 27-day deadline to report a calf birth.'
          ],
          acknowledgedLateDateOfBirth: LATE_DATE
        })
      )
      expect(response.code).toHaveBeenCalledWith(200)
    })

    test('it continues when the late date has been acknowledged', async () => {
      // Arrange
      const request = {
        params: { cph: CPH, submissionId: SUBMISSION_ID },
        payload: {
          ...validAnswers,
          dateOfBirth: LATE_DATE,
          acknowledgedLateDateOfBirth: LATE_DATE
        }
      }
      const { h } = toolkit()

      // Act
      await calfDetailsSubmitController.handler(request, h)

      // Assert
      expect(mocks.saveCalfDetails).toHaveBeenCalledWith({
        cph: CPH,
        submissionId: SUBMISSION_ID,
        answers: { ...validAnswers, dateOfBirth: LATE_DATE }
      })
      expect(h.redirect).toHaveBeenCalledWith(
        `${START_PATH}/${SUBMISSION_ID}/dam-details`
      )
    })

    test('it warns again when the acknowledged date has changed', async () => {
      // Arrange
      const request = {
        params: { cph: CPH, submissionId: SUBMISSION_ID },
        payload: {
          ...validAnswers,
          dateOfBirth: LATE_DATE,
          acknowledgedLateDateOfBirth: '1/1/2020'
        }
      }
      const { h } = toolkit()

      // Act
      await calfDetailsSubmitController.handler(request, h)

      // Assert
      expect(mocks.saveCalfDetails).not.toHaveBeenCalled()
      expect(h.view).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({ acknowledgedLateDateOfBirth: LATE_DATE })
      )
    })

    test("it starts over when the submission is no longer the holding's", async () => {
      // Arrange
      const request = {
        params: { cph: CPH, submissionId: SUBMISSION_ID },
        payload: { ...validAnswers, acknowledgedLateDateOfBirth: '' }
      }
      const { h } = toolkit()
      mocks.saveCalfDetails.mockResolvedValueOnce(false)

      // Act
      await calfDetailsSubmitController.handler(request, h)

      // Assert
      expect(h.redirect).toHaveBeenCalledWith(START_PATH)
    })
  })
})
