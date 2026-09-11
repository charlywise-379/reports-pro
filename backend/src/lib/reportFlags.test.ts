import { describe, it, expect } from 'vitest'
import {
  partnerReportBlockedHours,
  computeReportEligibility,
  computeReportFlags,
  PARTNER_REPORT_MIN_HOURS,
} from './reportFlags'

const now = new Date('2026-09-10T12:00:00Z')
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000)

describe('partnerReportBlockedHours', () => {
  it('permite si nunca hubo reporte', () => {
    expect(partnerReportBlockedHours(null, now)).toBe(0)
  })
  it('permite si el último reporte tiene >= 720h', () => {
    expect(partnerReportBlockedHours(hoursAgo(720), now)).toBe(0)
    expect(partnerReportBlockedHours(hoursAgo(800), now)).toBe(0)
  })
  it('bloquea con las horas restantes redondeadas hacia arriba', () => {
    expect(partnerReportBlockedHours(hoursAgo(700), now)).toBe(20)
    expect(partnerReportBlockedHours(hoursAgo(719.2), now)).toBe(1)
  })
  it('PARTNER_REPORT_MIN_HOURS es 720', () => {
    expect(PARTNER_REPORT_MIN_HOURS).toBe(720)
  })
})

describe('computeReportEligibility', () => {
  it('partner siempre elegible', () => {
    expect(computeReportEligibility({
      accountType: 'PARTNER', trialVigente: false, tieneStripe: false, eligibleViaFullAccessPromo: false,
    })).toBe(true)
  })
  it('standard: elegible solo con trial vigente, stripe o promo full-access', () => {
    const base = { accountType: 'STANDARD' as const, trialVigente: false, tieneStripe: false, eligibleViaFullAccessPromo: false }
    expect(computeReportEligibility(base)).toBe(false)
    expect(computeReportEligibility({ ...base, trialVigente: true })).toBe(true)
    expect(computeReportEligibility({ ...base, tieneStripe: true })).toBe(true)
    expect(computeReportEligibility({ ...base, eligibleViaFullAccessPromo: true })).toBe(true)
  })
})

describe('computeReportFlags', () => {
  it('partner: nunca free, nunca teaser', () => {
    expect(computeReportFlags({
      accountType: 'PARTNER', hasPaid: false, freeReportUsedAt: null, hasPromoAccess: false,
    })).toEqual({ isFreeReport: false, isTeaser: false })
  })
  it('standard sin pago y sin free usado: free + teaser (si no hay promo)', () => {
    expect(computeReportFlags({
      accountType: 'STANDARD', hasPaid: false, freeReportUsedAt: null, hasPromoAccess: false,
    })).toEqual({ isFreeReport: true, isTeaser: true })
  })
  it('standard con promo access: free pero NO teaser', () => {
    expect(computeReportFlags({
      accountType: 'STANDARD', hasPaid: false, freeReportUsedAt: null, hasPromoAccess: true,
    })).toEqual({ isFreeReport: true, isTeaser: false })
  })
  it('standard pagado: ni free ni teaser', () => {
    expect(computeReportFlags({
      accountType: 'STANDARD', hasPaid: true, freeReportUsedAt: null, hasPromoAccess: false,
    })).toEqual({ isFreeReport: false, isTeaser: false })
  })
  it('standard con free ya usado: ni free ni teaser', () => {
    expect(computeReportFlags({
      accountType: 'STANDARD', hasPaid: false, freeReportUsedAt: new Date(), hasPromoAccess: false,
    })).toEqual({ isFreeReport: false, isTeaser: false })
  })
})
