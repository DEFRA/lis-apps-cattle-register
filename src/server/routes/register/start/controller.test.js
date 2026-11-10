import { registrationClient } from '#server/services/registration-client.js'
import { startRegistrationController } from './controller.js'

vi.mock('#server/services/registration-client.js')

const mocks = {
  startRegistration: vi.mocked(registrationClient.startRegistration)
}

describe('startRegistrationController', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  test("it starts the holding's registration and redirects to its calf details", async () => {
    // Arrange
    const request = { params: { cph: '10/081/1234' } }
    const h = { redirect: vi.fn().mockReturnValue('redirected') }
    mocks.startRegistration.mockResolvedValueOnce({
      submissionId: '7ZK-M3Q-A9D',
      animalId: '1'
    })

    // Act
    const result = await startRegistrationController.handler(request, h)

    // Assert
    expect(mocks.startRegistration).toHaveBeenCalledWith({ cph: '10/081/1234' })
    expect(h.redirect).toHaveBeenCalledWith(
      '/holdings/10/081/1234/cattle/register/7ZK-M3Q-A9D/calves/1/calf-details'
    )
    expect(result).toBe('redirected')
  })

  test('it rethrows a BE4FE failure', async () => {
    // Arrange
    const request = { params: { cph: '10/081/1234' } }
    const h = { redirect: vi.fn() }
    const failure = new Error('503 - Service unavailable')
    mocks.startRegistration.mockRejectedValueOnce(failure)

    // Act
    let error
    try {
      await startRegistrationController.handler(request, h)
    } catch (e) {
      error = e
    }

    // Assert
    expect(error).toBe(failure)
    expect(h.redirect).not.toHaveBeenCalled()
  })
})
