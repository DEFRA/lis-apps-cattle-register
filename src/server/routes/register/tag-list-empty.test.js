import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import { load } from 'cheerio'

import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'

import {
  REGISTER_PATH,
  calfPath,
  keeperAuth,
  postForm,
  startRegistration
} from '#test-helpers/calf-registration.js'
import { createServer } from '#server/server.js'

const NOW = new Date('2026-11-05T10:00:00Z')

describe('tag list route for a registration with every calf cancelled', () => {
  let server

  /**
   * @param {string} registrationId
   * @returns {string}
   */
  function tagListPath(registrationId) {
    return `${REGISTER_PATH}/${registrationId}/tag-list`
  }

  /**
   * @returns {Promise<string>} a registration whose only calf was cancelled
   */
  async function emptyRegistration() {
    const registrationId = await startRegistration(server)
    await postForm(server, calfPath(registrationId, 'cancel'), {})

    return registrationId
  }

  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
    vi.useRealTimers()
  })

  test('GET shows the intro, says no animals are added in place of the list, and asks to add more', async () => {
    // Arrange
    const registrationId = await emptyRegistration()

    // Act
    const response = await server.inject({
      method: 'GET',
      url: tagListPath(registrationId),
      auth: keeperAuth
    })

    // Assert
    expect(response.statusCode).toBe(statusCodes.ok)
    const $ = load(response.payload)
    expect($('h1').text().trim()).toBe('Register new cattle births')
    expect($('#calves')).toHaveLength(0)
    expect($('main p.govuk-body').first().text().trim()).toMatch(
      /^Select the tag number from the list/
    )
    expect($('main p.govuk-body').eq(1).text().trim()).toBe(
      'You have not added any animals to this registration.'
    )
    expect($('.govuk-back-link').attr('href')).toBe(
      calfPath(registrationId, 'calf-details')
    )
    expect($('legend').text().trim()).toBe('Add more animals')
  })

  test('POST yes continues to calf details for the first calf', async () => {
    // Arrange
    const registrationId = await emptyRegistration()

    // Act
    const response = await postForm(server, tagListPath(registrationId), {
      addAnother: 'yes'
    })

    // Assert
    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(
      calfPath(registrationId, 'calf-details')
    )
  })

  test('POST no asks for an animal to be added', async () => {
    // Arrange
    const registrationId = await emptyRegistration()
    const message = 'Add at least one animal before continuing'

    // Act
    const response = await postForm(server, tagListPath(registrationId), {
      addAnother: 'no'
    })

    // Assert
    expect(response.statusCode).toBe(statusCodes.badRequest)
    const $ = load(response.payload)
    expect($('title').text().trim()).toMatch(/^Error: /)
    expect($('.govuk-error-summary a').text().trim()).toBe(message)
    expect($('.govuk-error-summary a').attr('href')).toBe('#addAnother')
    expect($('#addAnother-error').text().trim()).toBe(`Error: ${message}`)
  })
})
