import { describe, it, expect } from 'vitest'
import { hasConfiguredSetup } from './scheduleEligibility'

describe('hasConfiguredSetup', () => {
  it('false sin competitiveSetup', () => {
    expect(hasConfiguredSetup({ competitiveSetup: null })).toBe(false)
    expect(hasConfiguredSetup({})).toBe(false)
  })
  it('false si companyName está vacío o en blanco', () => {
    expect(hasConfiguredSetup({ competitiveSetup: { companyName: '' } })).toBe(false)
    expect(hasConfiguredSetup({ competitiveSetup: { companyName: '   ' } })).toBe(false)
    expect(hasConfiguredSetup({ competitiveSetup: { companyName: null } })).toBe(false)
  })
  it('true con companyName no vacío', () => {
    expect(hasConfiguredSetup({ competitiveSetup: { companyName: 'Acme' } })).toBe(true)
  })
})
