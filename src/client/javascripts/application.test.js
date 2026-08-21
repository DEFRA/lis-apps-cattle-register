import { describe, expect, test, vi } from 'vitest'

const { Button, Checkboxes, ErrorSummary, Radios, SkipLink, createAll } =
  vi.hoisted(() => ({
    Button: class {},
    Checkboxes: class {},
    ErrorSummary: class {},
    Radios: class {},
    SkipLink: class {},
    createAll: vi.fn()
  }))

const { initAllAutocompletes } = vi.hoisted(() => ({
  initAllAutocompletes: vi.fn()
}))

vi.mock('govuk-frontend', () => ({
  Button,
  Checkboxes,
  ErrorSummary,
  Radios,
  SkipLink,
  createAll
}))

vi.mock('@defra/lis-infra-ui-services/components/autocomplete', () => ({
  initAllAutocompletes
}))

describe('browser application bootstrap', () => {
  test('initialises each GOV.UK component', async () => {
    await import('./application.js')

    expect(createAll.mock.calls).toEqual([
      [Button],
      [Checkboxes],
      [ErrorSummary],
      [Radios],
      [SkipLink]
    ])
    expect(initAllAutocompletes).toHaveBeenCalledOnce()
  })
})
