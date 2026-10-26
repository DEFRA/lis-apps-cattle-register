import process from 'node:process'

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const { logger, startServer } = vi.hoisted(() => ({
  logger: { info: vi.fn(), error: vi.fn(), fatal: vi.fn() },
  startServer: vi.fn()
}))

vi.mock('@defra/lis-hubs-infra-core', () => ({ logger }))
vi.mock('#server/common/helpers/start-server.js', () => ({ startServer }))

const HANDLED_EVENTS = ['unhandledRejection', 'uncaughtException']

function findHandler(processOn, event) {
  return processOn.mock.calls.find(([name]) => name === event)?.[1]
}

describe('application entrypoint', () => {
  let processOn
  let processExit

  beforeEach(() => {
    vi.resetModules()
    processOn = vi.spyOn(process, 'on')
    processExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined)
  })

  afterEach(() => {
    for (const event of HANDLED_EVENTS) {
      const handler = findHandler(processOn, event)
      if (handler) process.off(event, handler)
    }
    vi.restoreAllMocks()
    vi.clearAllMocks()
    process.exitCode = undefined
  })

  test('registers both process handlers before starting the server', async () => {
    await import('./index.js')

    expect(startServer).toHaveBeenCalledOnce()
    const registered = processOn.mock.calls.map(([name]) => name)
    expect(registered).toEqual(expect.arrayContaining(HANDLED_EVENTS))
    const lastHandlerOrder = Math.max(...processOn.mock.invocationCallOrder)
    expect(lastHandlerOrder).toBeLessThan(
      startServer.mock.invocationCallOrder[0]
    )
  })

  test('logs unhandled rejections with the error and sets the exit code', async () => {
    await import('./index.js')
    const error = new Error('test rejection')

    findHandler(processOn, 'unhandledRejection')(error)

    expect(logger.error).toHaveBeenCalledWith(error, 'Unhandled rejection')
    expect(process.exitCode).toBe(1)
    expect(processExit).not.toHaveBeenCalled()
  })

  test('logs uncaught exceptions as fatal and exits', async () => {
    await import('./index.js')
    const error = new Error('test exception')

    findHandler(processOn, 'uncaughtException')(error)

    expect(logger.fatal).toHaveBeenCalledWith(error, 'Uncaught exception')
    expect(processExit).toHaveBeenCalledWith(1)
  })

  test('logs a startup failure as fatal and exits', async () => {
    const error = new Error('port in use')
    startServer.mockRejectedValueOnce(error)

    await import('./index.js')

    expect(logger.fatal).toHaveBeenCalledWith(error, 'Server failed to start')
    expect(processExit).toHaveBeenCalledWith(1)
  })
})
