import process from 'node:process'

import { afterEach, describe, expect, test, vi } from 'vitest'

const { getLoggerForConfig, logger, startServer } = vi.hoisted(() => ({
  getLoggerForConfig: vi.fn(),
  logger: { info: vi.fn(), error: vi.fn() },
  startServer: vi.fn()
}))

vi.mock('@defra/lis-infra-ui-services/logging', () => ({ getLoggerForConfig }))
vi.mock('#server/common/helpers/start-server.js', () => ({ startServer }))

getLoggerForConfig.mockReturnValue(logger)

describe('application entrypoint', () => {
  afterEach(() => {
    process.exitCode = undefined
  })

  test('starts the server and logs unhandled rejections', async () => {
    const processOn = vi.spyOn(process, 'on')

    await import('./index.js')

    expect(startServer).toHaveBeenCalledOnce()
    const rejectionHandler = processOn.mock.calls.find(
      ([event]) => event === 'unhandledRejection'
    )?.[1]
    const error = new Error('test rejection')

    rejectionHandler(error)

    expect(logger.info).toHaveBeenCalledWith('Unhandled rejection')
    expect(logger.error).toHaveBeenCalledWith(error)
    expect(process.exitCode).toBe(1)
  })
})
