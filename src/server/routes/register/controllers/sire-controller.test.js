import { describe, expect, test, vi } from 'vitest'

import { sireController, sireSubmitController } from './sire-controller.js'

const request = {
  app: {},
  params: {
    county: '10',
    parish: '081',
    holding: '1234',
    bundleId: 'REG-123'
  }
}

describe('sire controller', () => {
  test('renders empty optional sire details', () => {
    const view = vi.fn()

    sireController.handler(request, { view })

    expect(view).toHaveBeenCalledWith(
      './register/sire.njk',
      expect.objectContaining({
        pageTitle: 'Sire details',
        backUrl: '/cattle/register/10/081/1234/bundles/REG-123/dam',
        formValues: { sire_tag: '', sire_name: '' },
        errors: {},
        errorList: []
      })
    )
  })

  test('redisplays submitted values and validation errors', () => {
    const response = {
      code: vi.fn().mockReturnThis(),
      takeover: vi.fn().mockReturnThis()
    }
    const h = { view: vi.fn().mockReturnValue(response) }
    const validationError = {
      data: {
        details: [
          { path: ['sire_tag'] },
          { path: ['sire_name'] },
          { path: ['unknown'] }
        ]
      }
    }

    sireSubmitController.options.validate.failAction(
      {
        ...request,
        payload: { sire_tag: ' UK123 ', sire_name: ' Fred ' }
      },
      h,
      validationError
    )

    expect(h.view).toHaveBeenCalledWith(
      './register/sire.njk',
      expect.objectContaining({
        pageTitle: 'Error: Sire details',
        formValues: { sire_tag: 'UK123', sire_name: 'Fred' },
        errors: {
          sire_tag: 'Enter the sire ear tag number as text',
          sire_name: 'Enter the sire name as text'
        },
        errorList: [
          { text: 'Enter the sire ear tag number as text', href: '#sire_tag' },
          { text: 'Enter the sire name as text', href: '#sire_name' }
        ]
      })
    )
    expect(response.code).toHaveBeenCalledWith(400)
    expect(response.takeover).toHaveBeenCalled()
  })
})
