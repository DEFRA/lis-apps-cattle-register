import { describe, expect, test, vi } from 'vitest'

import { calfController, calfSubmitController } from './calf-controller.js'
import { damController, damSubmitController } from './dam-controller.js'
import {
  geneticDamController,
  geneticDamSubmitController
} from './genetic-dam-controller.js'
import {
  surrogateDamController,
  surrogateDamSubmitController
} from './surrogate-dam-controller.js'
import { sireSubmitController } from './sire-controller.js'

const request = {
  app: {},
  params: {
    county: '10',
    parish: '081',
    holding: '1234',
    bundleId: 'REG-123'
  }
}

function responseToolkit() {
  const response = {
    code: vi.fn().mockReturnThis(),
    takeover: vi.fn().mockReturnThis()
  }
  return { response, view: vi.fn().mockReturnValue(response) }
}

describe.each([
  ['calf', calfController, './register/calf.njk'],
  ['dam', damController, './register/dam.njk'],
  ['genetic dam', geneticDamController, './register/genetic-dam.njk'],
  ['surrogate dam', surrogateDamController, './register/surrogate-dam.njk']
])('%s controller', (_name, controller, template) => {
  test('derives the CPH from route parameters', () => {
    const view = vi.fn()

    controller.handler(request, { view })

    expect(view).toHaveBeenCalledWith(
      template,
      expect.objectContaining({
        postBackUrl: expect.stringContaining('/10/081/1234/')
      })
    )
  })
})

describe.each([
  [
    'calf',
    calfSubmitController,
    { calf_tag: ' UK123 ', sex: 'female' },
    [
      { path: ['calf_tag'] },
      { path: ['dob-day'] },
      { path: ['sex'] },
      { path: ['breed'] },
      { path: ['unknown'] }
    ],
    ['tag', 'dob', 'sex', 'breed']
  ],
  [
    'dam',
    damSubmitController,
    { dam_type: ' genetic ' },
    [{ path: ['dam_type'] }, { path: ['unknown'] }],
    ['dam_type']
  ],
  [
    'genetic dam',
    geneticDamSubmitController,
    { genetic_dam_tag: ' UK123 ' },
    [{ path: ['genetic_dam_tag'] }, { path: ['unknown'] }],
    ['genetic_dam_tag']
  ],
  [
    'surrogate dam',
    surrogateDamSubmitController,
    { genetic_dam_tag: ' UK123 ', surrogate_tag: ' UK456 ' },
    [
      { path: ['genetic_dam_tag'] },
      { path: ['surrogate_tag'] },
      { path: ['unknown'] }
    ],
    ['genetic_dam_tag', 'surrogate_tag']
  ]
])(
  '%s validation',
  (_name, controller, payload, details, expectedErrorFields) => {
    test('handles nested validation details and ignores unknown fields', () => {
      const h = responseToolkit()

      controller.options.validate.failAction({ ...request, payload }, h, {
        data: { details }
      })

      const viewModel = h.view.mock.calls[0][1]
      expect(Object.keys(viewModel.errors)).toEqual(expectedErrorFields)
      expect(viewModel.pageTitle).toMatch(/^Error:/)
      expect(h.response.code).toHaveBeenCalledWith(400)
      expect(h.response.takeover).toHaveBeenCalled()
    })
  }
)

describe.each([
  ['calf', calfSubmitController],
  ['dam', damSubmitController],
  ['genetic dam', geneticDamSubmitController],
  ['surrogate dam', surrogateDamSubmitController],
  ['sire', sireSubmitController]
])('%s empty validation context', (_name, controller) => {
  test('handles an absent payload and validation details', () => {
    const h = responseToolkit()

    controller.options.validate.failAction(
      { ...request, payload: undefined },
      h,
      undefined
    )

    expect(h.view.mock.calls[0][1]).toEqual(
      expect.objectContaining({ errors: {}, errorList: [] })
    )
    expect(h.response.code).toHaveBeenCalledWith(400)
  })
})
