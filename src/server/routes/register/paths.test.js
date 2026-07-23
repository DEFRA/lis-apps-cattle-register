import { describe, expect, test } from 'vitest'
import {
  bundlePath,
  bundleRoot,
  bundlesRoot,
  cphFromParams,
  cphPath,
  holdingRoot
} from './paths.js'

describe('registration paths', () => {
  test('builds the complete CPH resource hierarchy', () => {
    expect(
      cphFromParams({ county: '12', parish: '345', holding: '6789' })
    ).toBe('12/345/6789')
    expect(cphPath('12/345/6789')).toBe('12/345/6789')
    expect(holdingRoot('12/345/6789')).toBe('/cattle/register/12/345/6789')
    expect(bundlesRoot('12/345/6789')).toBe(
      '/cattle/register/12/345/6789/bundles'
    )
    expect(bundleRoot('12/345/6789', 'REG / 1')).toBe(
      '/cattle/register/12/345/6789/bundles/REG%20%2F%201'
    )
    expect(bundlePath('12/345/6789', 'REG-1', 'calves/CALF-1/check')).toBe(
      '/cattle/register/12/345/6789/bundles/REG-1/calves/CALF-1/check'
    )
  })

  test('returns null when the route does not contain a complete CPH', () => {
    expect(cphFromParams()).toBeNull()
    expect(cphFromParams({ county: '12', parish: '345' })).toBeNull()
  })

  test.each([
    undefined,
    '',
    '12/345',
    '1/345/6789',
    '12/34/6789',
    '12/345/678',
    'AA/345/6789'
  ])('rejects invalid CPH %s', (cph) => {
    expect(() => cphPath(cph)).toThrow(`Invalid CPH: ${cph}`)
  })
})
