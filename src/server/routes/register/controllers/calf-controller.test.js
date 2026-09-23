import { describe, expect, test, vi } from 'vitest'
import { breeds } from '@defra/lis-species-cattle'

import { calfController, calfSubmitController } from './calf-controller.js'

const request = {
  app: {},
  params: {
    county: '10',
    parish: '081',
    holding: '1234',
    bundleId: 'REG-123'
  }
}

describe('calf controller', () => {
  test('renders empty calf details with breed items built from the breed map', () => {
    const view = vi.fn()

    calfController.handler(request, { view })

    expect(view).toHaveBeenCalledWith(
      './register/calf.njk',
      expect.objectContaining({
        pageTitle: 'Calf details',
        backUrl: '/cattle/register/10/081/1234',
        breeds: Object.entries(breeds).map(([value, text]) => ({
          value,
          text
        })),
        formValues: {
          calf_tag: '',
          'dob-day': '',
          'dob-month': '',
          'dob-year': '',
          sex: '',
          breed: ''
        },
        errors: {},
        errorList: []
      })
    )
  })

  const validPayload = {
    calf_tag: 'UK123456789',
    'dob-day': '1',
    'dob-month': '1',
    'dob-year': '2024',
    sex: 'male',
    breed: 'AA'
  }

  test('accepts a valid breed code', () => {
    const payload = { ...validPayload, breed: 'AA' }

    const { error, value } =
      calfSubmitController.options.validate.payload.validate(payload)

    expect(error).toBeUndefined()
    expect(value.breed).toEqual('AA')
  })

  test('normalises a lower-case breed code to the upper-case code', () => {
    const payload = { ...validPayload, breed: 'aa' }

    const { error, value } =
      calfSubmitController.options.validate.payload.validate(payload)

    expect(error).toBeUndefined()
    expect(value.breed).toEqual('AA')
  })

  test('rejects an unknown breed code', () => {
    const validationError = {
      data: {
        details: [{ path: ['breed'], type: 'breed.unknown' }]
      }
    }
    const response = {
      code: vi.fn().mockReturnThis(),
      takeover: vi.fn().mockReturnThis()
    }
    const h = { view: vi.fn().mockReturnValue(response) }

    calfSubmitController.options.validate.failAction(
      {
        ...request,
        payload: {
          calf_tag: '',
          'dob-day': '',
          'dob-month': '',
          'dob-year': '',
          sex: '',
          breed: 'ZZZZ'
        }
      },
      h,
      validationError
    )

    expect(h.view).toHaveBeenCalledWith(
      './register/calf.njk',
      expect.objectContaining({
        errors: { breed: 'Select a breed from the list' }
      })
    )
    expect(response.code).toHaveBeenCalledWith(400)
    expect(response.takeover).toHaveBeenCalled()
  })

  test('gives the empty-value message when breed is missing', () => {
    const validationError = {
      data: {
        details: [{ path: ['breed'], type: 'string.empty' }]
      }
    }
    const response = {
      code: vi.fn().mockReturnThis(),
      takeover: vi.fn().mockReturnThis()
    }
    const h = { view: vi.fn().mockReturnValue(response) }

    calfSubmitController.options.validate.failAction(
      {
        ...request,
        payload: {
          calf_tag: '',
          'dob-day': '',
          'dob-month': '',
          'dob-year': '',
          sex: '',
          breed: ''
        }
      },
      h,
      validationError
    )

    expect(h.view).toHaveBeenCalledWith(
      './register/calf.njk',
      expect.objectContaining({
        errors: { breed: 'Select the calf breed' }
      })
    )
  })
})
