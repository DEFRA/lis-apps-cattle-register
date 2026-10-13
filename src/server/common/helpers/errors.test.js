import { afterEach, vi } from 'vitest'
import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'
import { logger } from '@defra/lis-hubs-infra-core'

import { catchAll } from '@defra/lis-infra-ui-services/errors'
import { createServer } from '../../server.js'

describe('#errors', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should provide expected Not Found page', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/non-existent-path'
    })

    expect(result).toEqual(
      expect.stringContaining(
        'Page not found - Register for Cattle - Livestock Information'
      )
    )
    expect(statusCode).toBe(statusCodes.notFound)
  })
})

describe('#catchAll', () => {
  const mockErrorLogger = vi.fn()
  vi.spyOn(logger, 'error', 'get').mockReturnValue(mockErrorLogger)
  const mockRequest = (statusCode) => ({
    response: {
      isBoom: true,
      message: 'Mock error message',
      output: {
        statusCode
      }
    }
  })
  const mockToolkitView = vi.fn()
  const mockToolkitCode = vi.fn()
  const mockToolkit = {
    view: mockToolkitView.mockReturnThis(),
    code: mockToolkitCode.mockReturnThis()
  }

  afterEach(() => {
    vi.clearAllMocks()
  })

  test('Should provide the page not found page for a 404', () => {
    catchAll(mockRequest(statusCodes.notFound), mockToolkit)

    expect(mockErrorLogger).not.toHaveBeenCalled()
    expect(mockToolkitView).toHaveBeenCalledWith('error/page-not-found', {
      pageTitle: 'Page not found',
      developmentMessage: undefined
    })
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.notFound)
  })

  test('Should provide the not authorised page for a 403', () => {
    catchAll(mockRequest(statusCodes.forbidden), mockToolkit)

    expect(mockErrorLogger).not.toHaveBeenCalled()
    expect(mockToolkitView).toHaveBeenCalledWith('error/not-authorised', {
      pageTitle: 'Sorry, you are not authorised to view this page',
      developmentMessage: undefined
    })
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.forbidden)
  })

  test('Should provide the not authorised page for a 401', () => {
    catchAll(mockRequest(statusCodes.unauthorized), mockToolkit)

    expect(mockErrorLogger).not.toHaveBeenCalled()
    expect(mockToolkitView).toHaveBeenCalledWith('error/not-authorised', {
      pageTitle: 'Sorry, you are not authorised to view this page',
      developmentMessage: undefined
    })
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.unauthorized)
  })

  test('Should provide the problem with the service page for a 400', () => {
    catchAll(mockRequest(statusCodes.badRequest), mockToolkit)

    expect(mockErrorLogger).not.toHaveBeenCalled()
    expect(mockToolkitView).toHaveBeenCalledWith('error/problem-with-service', {
      pageTitle: 'Sorry, there is a problem with the service',
      developmentMessage: undefined
    })
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.badRequest)
  })

  test('Should provide the service unavailable page for a 503', () => {
    catchAll(mockRequest(statusCodes.serviceUnavailable), mockToolkit)

    expect(mockToolkitView).toHaveBeenCalledWith('error/service-unavailable', {
      pageTitle: 'Sorry, the service is unavailable',
      developmentMessage: undefined
    })
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.serviceUnavailable)
  })

  test('Should provide the problem with the service page and log the error for a 500', () => {
    catchAll(mockRequest(statusCodes.internalServerError), mockToolkit)

    expect(mockErrorLogger).toHaveBeenCalledTimes(1)
    expect(mockToolkitView).toHaveBeenCalledWith('error/problem-with-service', {
      pageTitle: 'Sorry, there is a problem with the service',
      developmentMessage: undefined
    })
    expect(mockToolkitCode).toHaveBeenCalledWith(
      statusCodes.internalServerError
    )
  })
})
