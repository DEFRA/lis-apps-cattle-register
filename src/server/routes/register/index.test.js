import { register } from './index.js'
import {
  demandRegisterAccess,
  demandSubmissionOfHolding
} from './holding-access.js'
import { redirectOnSaveConflict } from './save-conflict.js'
import { MAX_FIELD_LENGTH } from './form-limits.js'

vi.mock('#server/services/registration-client.js')

/** @import { ServerRoute } from '@hapi/hapi' */

/**
 * @returns {ServerRoute[]} the routes the plugin registers
 */
function registeredRoutes() {
  const server = { route: vi.fn(), ext: vi.fn() }
  register.plugin.register(server)

  return server.route.mock.calls.flatMap(([routes]) => routes)
}

/**
 * @param {string} method
 * @param {string} pathEnd - the end of the route's path
 * @returns {ServerRoute} the registered route
 */
function routeAt(method, pathEnd) {
  return registeredRoutes().find(
    (route) => route.method === method && route.path.endsWith(pathEnd)
  )
}

/**
 * @param {Function} failAction
 * @param {string} source - what failed validation: params or payload
 * @returns {Error} what the fail action throws for it
 */
function failureFor(failAction, source) {
  try {
    failAction({}, {}, { output: { payload: { validation: { source } } } })
  } catch (error) {
    return error
  }
}

const validParams = {
  cph: '10/081/1234',
  submissionId: '7ZK-M3Q-A9D',
  animalId: 'UK123456301550'
}

describe('register routes', () => {
  test("every route about a submission demands register access, then that the submission is the holding's", () => {
    // Arrange
    const routes = registeredRoutes().filter(({ path }) =>
      path.includes('{submissionId}')
    )

    // Act
    const pres = routes.map(({ method, path, options }) => [
      `${method} ${path}`,
      options.pre.map(({ method: pre }) => pre)
    ])

    // Assert
    expect(routes.length).toBeGreaterThan(0)
    expect(pres).toEqual(
      routes.map(({ method, path }) => [
        `${method} ${path}`,
        [demandRegisterAccess, demandSubmissionOfHolding]
      ])
    )
  })

  test('a route with no submission demands only register access', () => {
    // Arrange
    const routes = registeredRoutes().filter(
      ({ path }) => !path.includes('{submissionId}')
    )

    // Act
    const pres = routes.map(({ options }) =>
      options.pre.map(({ method }) => method)
    )

    // Assert
    expect(routes.length).toBeGreaterThan(0)
    expect(pres).toEqual(routes.map(() => [demandRegisterAccess]))
  })

  test("its redirect for a save the BE4FE turns away runs on the plugin's own routes", () => {
    // Arrange
    const server = { route: vi.fn(), ext: vi.fn() }

    // Act
    register.plugin.register(server)

    // Assert
    expect(server.ext).toHaveBeenCalledWith(
      'onPreResponse',
      redirectOnSaveConflict,
      { sandbox: 'plugin' }
    )
  })

  test.each([
    ['params', 404],
    ['payload', 400]
  ])('a request whose %s fail validation is answered %i', (source, code) => {
    // Arrange
    const { failAction } = routeAt('GET', '/register').options.validate

    // Act
    const error = failureFor(failAction, source)

    // Assert
    expect(error.output.statusCode).toBe(code)
  })

  test.each([
    ['GET', '/register', { cph: validParams.cph }],
    ['GET', '/calves/calf-details', validParams],
    ['GET', '/{animalId}/calf-details', validParams]
  ])('%s …%s takes well-formed params', (method, pathEnd, params) => {
    // Arrange
    const schema = routeAt(method, pathEnd).options.validate.params

    // Act
    const { error } = schema.validate(params, { allowUnknown: true })

    // Assert
    expect(error).toBeUndefined()
  })

  test.each([
    ['GET', '/register', 'cph', '10/81/1234'],
    ['GET', '/calves/calf-details', 'cph', '1008112340'],
    ['GET', '/calves/calf-details', 'submissionId', '7ZK-M3Q-A9U'],
    ['GET', '/calves/calf-details', 'submissionId', '7ZKM3QA9D'],
    ['GET', '/{animalId}/calf-details', 'animalId', 'UK 123456301550'],
    ['GET', '/{animalId}/calf-details', 'animalId', 'UK1234563015501234567'],
    ['GET', '/{animalId}/calf-details', 'animalId', '../calf-details']
  ])('%s …%s refuses %s %j', (method, pathEnd, name, value) => {
    // Arrange
    const schema = routeAt(method, pathEnd).options.validate.params
    const params = { ...validParams, [name]: value }

    // Act
    const { error } = schema.validate(params, { allowUnknown: true })

    // Assert
    expect(error).toBeDefined()
  })

  test('every route that takes a form refuses a field that is not one string, or is too long', () => {
    // Arrange
    const forms = registeredRoutes().filter(
      ({ options }) => options.validate.payload
    )

    // Act
    const accepted = forms.flatMap(({ path, options }) => {
      const schema = options.validate.payload
      const fields = Object.keys(schema.describe().keys)

      return fields.flatMap((field) =>
        [['a', 'b'], 'a'.repeat(MAX_FIELD_LENGTH + 1)]
          .filter((value) => !schema.validate({ [field]: value }).error)
          .map((value) => `${path} ${field} ${JSON.stringify(value)}`)
      )
    })

    // Assert
    expect(forms.length).toBeGreaterThan(0)
    expect(accepted).toEqual([])
  })

  test('every route that takes a form gives a missing field as blank, and drops one it does not know', () => {
    // Arrange
    const forms = registeredRoutes().filter(
      ({ options }) => options.validate.payload
    )

    // Act
    const results = forms.map(({ options }) =>
      options.validate.payload.validate({ unknown: 'x' })
    )

    // Assert
    expect(results).toEqual(
      forms.map(({ options }) => ({
        value: Object.fromEntries(
          Object.keys(options.validate.payload.describe().keys).map((field) => [
            field,
            ''
          ])
        )
      }))
    )
  })
})
