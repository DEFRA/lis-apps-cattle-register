import { describe, expect, test } from 'vitest'
import {
  bundlePath,
  bundleRoot,
  bundlesRoot,
  cphPath,
  holdingRoot
} from './paths.js'

describe('registration paths', () => {
  test('builds the complete CPH resource hierarchy', () => {
    expect(cphPath('12/345/6789')).toBe('12/345/6789')
    expect(holdingRoot('12/345/6789')).toBe(
      '/holdings/12/345/6789/cattle/register'
    )
    expect(bundlesRoot('12/345/6789')).toBe(
      '/holdings/12/345/6789/cattle/register/bundles'
    )
    expect(bundleRoot('12/345/6789', 'REG / 1')).toBe(
      '/holdings/12/345/6789/cattle/register/bundles/REG%20%2F%201'
    )
    expect(bundlePath('12/345/6789', 'REG-1', 'calves/CALF-1/check')).toBe(
      '/holdings/12/345/6789/cattle/register/bundles/REG-1/calves/CALF-1/check'
    )
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
