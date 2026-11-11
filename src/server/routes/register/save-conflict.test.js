import { describe, expect, test, vi } from 'vitest'
import Boom from '@hapi/boom'
import { ServiceRequestError } from '@defra/lis-hubs-infra-core'

import { redirectOnSaveConflict } from './save-conflict.js'

const PAGE =
  '/holdings/10/081/1234/cattle/register/7ZK-M3Q-A9D/calves/UK123456301550/dam-details'

/**
 * @param {number} statusCode
 * @returns {ServiceRequestError} as the service client throws for a call
 *   the BE4FE answers with that status, once hapi has made it the response
 */
function be4feFailure(statusCode) {
  return Boom.boomify(
    new ServiceRequestError(`Request failed - ${statusCode}`, {
      serviceName: 'lis-be4fe-cattle-register',
      method: 'POST',
      path: 'submission/7ZK-M3Q-A9D/UK123456301550',
      statusCode
    })
  )
}

/**
 * @param {string} method
 * @param {object} response
 * @param {string} [search]
 * @returns {object} a request to the page, answered with the response
 */
function requestFor(method, response, search = '') {
  return { method, response, url: new URL(`https://localhost${PAGE}${search}`) }
}

describe('redirectOnSaveConflict', () => {
  const h = {
    continue: Symbol('continue'),
    redirect: vi.fn((location) => ({ location }))
  }

  test.each([
    ['', PAGE],
    ['?return=check', `${PAGE}?return=check`]
  ])(
    'it redirects a post the BE4FE answers with a conflict to the page (query %j)',
    (search, expected) => {
      // Arrange
      const request = requestFor('post', be4feFailure(409), search)

      // Act
      const result = redirectOnSaveConflict(request, h)

      // Assert
      expect(result).toEqual({ location: expected })
    }
  )

  test.each([
    ['a get the BE4FE answers with a conflict', 'get', be4feFailure(409)],
    [
      'a post the BE4FE answers with another failure',
      'post',
      be4feFailure(500)
    ],
    [
      'a post answered with a conflict not from the BE4FE',
      'post',
      Boom.conflict()
    ],
    ['a post that succeeds', 'post', { statusCode: 302 }]
  ])('it leaves %s as it is', (_, method, response) => {
    // Arrange
    const request = requestFor(method, response)

    // Act
    const result = redirectOnSaveConflict(request, h)

    // Assert
    expect(result).toBe(h.continue)
  })
})
