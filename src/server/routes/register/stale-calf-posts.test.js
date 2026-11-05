import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
  vi
} from 'vitest'
import { load } from 'cheerio'

import {
  CPH,
  REGISTER_PATH,
  addCalf,
  calfDetailsPayload,
  calfPath,
  damPayloads,
  keeperAuth,
  postForm,
  sireDetailsPayload,
  startRegistration
} from '#test-helpers/calf-registration.js'
import { createServer } from '#server/server.js'
import { registrationClient } from '#server/services/registration-client.js'

const NOW = new Date('2026-11-05T10:00:00Z')
const CALF_1_TAG = 'UK123456301550'
const CALF_2_TAG = 'UK123456301552'
const CALF_3_TAG = 'UK123456301553'

describe('posts about a calf that has moved place', () => {
  let server

  /**
   * @param {string} registrationId
   * @returns {Promise<object[]>} the calves held for the test user on the
   *   test holding
   */
  async function calves(registrationId) {
    const registration = await registrationClient.getRegistration({
      cph: CPH,
      registrationId,
      userId: 'test-user'
    })

    return registration.calves
  }

  /**
   * @param {string} registrationId
   * @returns {Promise<string[]>} the ear tags of those calves, in order
   */
  async function earTags(registrationId) {
    return (await calves(registrationId)).map(
      (calf) => calf.calfDetails.earTagNumber
    )
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

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST cancel registration', () => {
    test('cancelling the same calf twice removes one calf', async () => {
      // Arrange
      const registrationId = await startRegistration(server)
      await addCalf(server, registrationId, 2)
      await addCalf(server, registrationId, 3)
      const url = calfPath(registrationId, 'cancel', 1)
      const payload = { calfEarTagNumber: CALF_1_TAG }

      // Act
      await postForm(server, url, payload)
      const response = await postForm(server, url, payload)

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(
        `${REGISTER_PATH}/${registrationId}/tag-list`
      )
      expect(await earTags(registrationId)).toEqual([CALF_2_TAG, CALF_3_TAG])
    })

    test.each([
      ['the ear tag of another calf', { calfEarTagNumber: CALF_2_TAG }],
      ['a blank ear tag', { calfEarTagNumber: '' }],
      ['no ear tag', { calfEarTagNumber: undefined }]
    ])(
      'a post with %s removes nothing and ends at the list of calves',
      async (_case, payload) => {
        // Arrange
        const registrationId = await startRegistration(server)
        await addCalf(server, registrationId, 2)

        // Act
        const response = await postForm(
          server,
          calfPath(registrationId, 'cancel', 1),
          payload
        )

        // Assert
        expect(response.statusCode).toBe(302)
        expect(response.headers.location).toBe(
          `${REGISTER_PATH}/${registrationId}/tag-list`
        )
        expect(await earTags(registrationId)).toEqual([CALF_1_TAG, CALF_2_TAG])
      }
    )

    test('the ear tag matches as the duplicate ear tag check matches it', async () => {
      // Arrange
      const registrationId = await startRegistration(server)

      // Act
      await postForm(server, calfPath(registrationId, 'cancel'), {
        calfEarTagNumber: ' uk 123456 301550 '
      })

      // Assert
      expect(await earTags(registrationId)).toEqual([])
    })

    test('the calves moved up a place keep their confirmation', async () => {
      // Arrange
      const registrationId = await startRegistration(server)
      await addCalf(server, registrationId, 2)
      await addCalf(server, registrationId, 3, { confirmed: false })

      // Act
      await postForm(server, calfPath(registrationId, 'cancel', 1), {
        calfEarTagNumber: CALF_1_TAG
      })

      // Assert
      const remaining = await calves(registrationId)
      expect(remaining.map((calf) => calf.checked)).toEqual([true, false])
    })
  })

  describe('POST check calf details', () => {
    test('a confirmation shown before an earlier calf was cancelled confirms nothing', async () => {
      // Arrange
      const registrationId = await startRegistration(server)
      await addCalf(server, registrationId, 2, { confirmed: false })
      await addCalf(server, registrationId, 3, { confirmed: false })
      await postForm(server, calfPath(registrationId, 'cancel', 1), {
        calfEarTagNumber: CALF_1_TAG
      })

      // Act
      const response = await postForm(
        server,
        calfPath(registrationId, 'check-calf-details', 2),
        { calfEarTagNumber: CALF_2_TAG }
      )

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(
        `${REGISTER_PATH}/${registrationId}/tag-list`
      )
      const remaining = await calves(registrationId)
      expect(remaining.map((calf) => calf.checked)).toEqual([false, false])
    })

    test('a confirmation for a calf no longer in the registration ends at the list of calves', async () => {
      // Arrange
      const registrationId = await startRegistration(server)
      const confirmCalf = vi.spyOn(registrationClient, 'confirmCalf')

      // Act
      const response = await postForm(
        server,
        calfPath(registrationId, 'check-calf-details', 2),
        { calfEarTagNumber: CALF_2_TAG }
      )

      // Assert
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(
        `${REGISTER_PATH}/${registrationId}/tag-list`
      )
      expect(confirmCalf).not.toHaveBeenCalled()
    })
  })

  describe('POST a page about one calf', () => {
    test.each([
      ['calf-details', 'saveCalfDetails', calfDetailsPayload],
      ['dam-details', 'saveDamDetails', { damType: 'genetic' }],
      ['genetic-dam', 'saveGeneticDam', damPayloads['genetic-dam']],
      ['sire-details', 'saveSireDetails', sireDetailsPayload]
    ])(
      '%s for another calf saves nothing and ends at the list of calves',
      async (page, save, answers) => {
        // Arrange
        const registrationId = await startRegistration(server)
        await addCalf(server, registrationId, 2)
        const saveSpy = vi.spyOn(registrationClient, save)

        // Act
        const response = await postForm(
          server,
          calfPath(registrationId, page, 1),
          { ...answers, calfEarTagNumber: CALF_2_TAG }
        )

        // Assert
        expect(response.statusCode).toBe(302)
        expect(response.headers.location).toBe(
          `${REGISTER_PATH}/${registrationId}/tag-list`
        )
        expect(saveSpy).not.toHaveBeenCalled()
      }
    )

    test('surrogate-dam for another calf saves nothing and ends at the list of calves', async () => {
      // Arrange
      const registrationId = await startRegistration(server, {
        damType: 'surrogate',
        damSaved: false
      })
      const saveSurrogateDam = vi.spyOn(registrationClient, 'saveSurrogateDam')

      // Act
      const response = await postForm(
        server,
        calfPath(registrationId, 'surrogate-dam'),
        { ...damPayloads['surrogate-dam'], calfEarTagNumber: CALF_2_TAG }
      )

      // Assert
      expect(response.headers.location).toBe(
        `${REGISTER_PATH}/${registrationId}/tag-list`
      )
      expect(saveSurrogateDam).not.toHaveBeenCalled()
    })

    test('calf details guards the calf as saved, not as edited', async () => {
      // Arrange
      const registrationId = await startRegistration(server)

      // Act
      const response = await postForm(
        server,
        calfPath(registrationId, 'calf-details'),
        {
          ...calfDetailsPayload,
          earTagNumber: CALF_3_TAG,
          calfEarTagNumber: CALF_1_TAG
        }
      )

      // Assert
      expect(response.headers.location).toBe(
        calfPath(registrationId, 'dam-details')
      )
      expect(await earTags(registrationId)).toEqual([CALF_3_TAG])
    })

    test('calf details for the next calf, not saved yet, is not guarded', async () => {
      // Arrange
      const registrationId = await startRegistration(server)

      // Act
      const response = await postForm(
        server,
        calfPath(registrationId, 'calf-details', 2),
        {
          ...calfDetailsPayload,
          earTagNumber: CALF_2_TAG,
          calfEarTagNumber: undefined
        }
      )

      // Assert
      expect(response.headers.location).toBe(
        calfPath(registrationId, 'dam-details', 2)
      )
      expect(await earTags(registrationId)).toEqual([CALF_1_TAG, CALF_2_TAG])
    })
  })

  describe('GET a page about one calf', () => {
    test.each([
      'calf-details',
      'dam-details',
      'genetic-dam',
      'sire-details',
      'check-calf-details',
      'cancel'
    ])('%s posts back the ear tag of the calf as saved', async (page) => {
      // Arrange
      const registrationId = await startRegistration(server)
      await addCalf(server, registrationId, 2)

      // Act
      const response = await server.inject({
        method: 'GET',
        url: calfPath(registrationId, page, 2),
        auth: keeperAuth
      })

      // Assert
      const $ = load(response.payload)
      expect($('main form input[name="calfEarTagNumber"]').val()).toBe(
        CALF_2_TAG
      )
    })

    test('surrogate-dam posts back the ear tag of the calf as saved', async () => {
      // Arrange
      const registrationId = await startRegistration(server, {
        damType: 'surrogate',
        damSaved: false
      })

      // Act
      const response = await server.inject({
        method: 'GET',
        url: calfPath(registrationId, 'surrogate-dam'),
        auth: keeperAuth
      })

      // Assert
      const $ = load(response.payload)
      expect($('main form input[name="calfEarTagNumber"]').val()).toBe(
        CALF_1_TAG
      )
    })
  })
})
