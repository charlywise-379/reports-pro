import { describe, it, expect } from 'vitest'
import { summarizePromoAccess } from './userPromoAccess'

describe('summarizePromoAccess', () => {
  it('sin canjes: sin acceso', () => {
    expect(summarizePromoAccess([])).toEqual({ hasPromoAccess: false, hasFullAccessPromo: false })
  })
  it('código estándar: acceso promocional pero no de acceso completo', () => {
    expect(summarizePromoAccess([{ type: 'STANDARD' }])).toEqual({ hasPromoAccess: true, hasFullAccessPromo: false })
  })
  it('basta un canje FULL_ACCESS_NO_TRIAL entre varios', () => {
    expect(summarizePromoAccess([{ type: 'STANDARD' }, { type: 'FULL_ACCESS_NO_TRIAL' }])).toEqual({ hasPromoAccess: true, hasFullAccessPromo: true })
  })
  it('un canje sin tipo cuenta como acceso promocional', () => {
    expect(summarizePromoAccess([{}])).toEqual({ hasPromoAccess: true, hasFullAccessPromo: false })
  })
})
