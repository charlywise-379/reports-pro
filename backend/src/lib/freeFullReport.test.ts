import { describe, it, expect } from 'vitest'
import { hasFreeFullReport } from './freeFullReport'

const base = { accountType: 'STANDARD', promoType: 'FULL_ACCESS_NO_TRIAL', freeReportUsedAt: null, hasPaid: false }

describe('hasFreeFullReport', () => {
  it('true: código de acceso completo canjeado y reporte gratis sin usar', () => {
    expect(hasFreeFullReport(base)).toBe(true)
  })
  it('false sin código o con código estándar', () => {
    expect(hasFreeFullReport({ ...base, promoType: null })).toBe(false)
    expect(hasFreeFullReport({ ...base, promoType: undefined })).toBe(false)
    expect(hasFreeFullReport({ ...base, promoType: 'STANDARD' })).toBe(false)
  })
  it('false si ya usó su reporte gratis o ya pagó', () => {
    expect(hasFreeFullReport({ ...base, freeReportUsedAt: new Date() })).toBe(false)
    expect(hasFreeFullReport({ ...base, hasPaid: true })).toBe(false)
  })
  it('false para partners (su acceso va por otra vía)', () => {
    expect(hasFreeFullReport({ ...base, accountType: 'PARTNER' })).toBe(false)
  })
})

describe('hasFreeFullReport por empresa', () => {
  const base = { accountType: 'STANDARD', promoType: 'FULL_ACCESS_NO_TRIAL', freeReportUsedAt: null, hasPaid: false }
  it('una empresa sin reporte gratis usado lo tiene aunque otra empresa del usuario ya lo haya usado', () => {
    expect(hasFreeFullReport(base)).toBe(true)
  })
  it('la empresa que ya lo usó no lo tiene', () => {
    expect(hasFreeFullReport({ ...base, freeReportUsedAt: new Date() })).toBe(false)
  })
})
