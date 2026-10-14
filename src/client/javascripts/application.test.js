import { describe, expect, test, vi } from 'vitest'

const {
  Button,
  Checkboxes,
  ErrorSummary,
  Radios,
  createAll,
  LayoutOne,
  LayoutTwo
} = vi.hoisted(() => ({
  Button: class {},
  Checkboxes: class {},
  ErrorSummary: class {},
  Radios: class {},
  createAll: vi.fn(),
  LayoutOne: class {},
  LayoutTwo: class {}
}))

const { initAllAutocompletes } = vi.hoisted(() => ({
  initAllAutocompletes: vi.fn()
}))

vi.mock('govuk-frontend', () => ({
  Button,
  Checkboxes,
  ErrorSummary,
  Radios,
  createAll
}))
vi.mock('@defra/lis-infra-ui-services/components/layout', () => ({
  layoutComponents: [LayoutOne, LayoutTwo]
}))
vi.mock('@defra/lis-infra-ui-services/components/error-pages', () => ({
  errorPageComponents: [Button]
}))
vi.mock('@defra/lis-infra-ui-services/components/autocomplete', () => ({
  initAllAutocompletes
}))

describe('browser application bootstrap', () => {
  test('starts each shared layout component, each error page component, then each page-level GOV.UK component, starting a component listed twice once', async () => {
    await import('./application.js')

    expect(createAll.mock.calls).toEqual([
      [LayoutOne],
      [LayoutTwo],
      [Button],
      [Checkboxes],
      [ErrorSummary],
      [Radios]
    ])
    expect(initAllAutocompletes).toHaveBeenCalledOnce()
  })
})
