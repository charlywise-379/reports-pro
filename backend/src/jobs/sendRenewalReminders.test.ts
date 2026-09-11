import { describe, it, expect } from 'vitest'
import {
  selectSubscriptionsToRemind, renewalPlanLabel, formatRenewalDate, RENEWAL_REMINDER_LEAD_HOURS,
  type ReminderCandidate,
} from './sendRenewalReminders'

const now = new Date('2026-09-10T12:00:00Z')
const inHours = (h: number) => new Date(now.getTime() + h * 3600_000)

function cand(over: Partial<ReminderCandidate> = {}): ReminderCandidate {
  return {
    id: 'sub_1', status: 'ACTIVE', stripeSubscriptionId: 'stripe_1',
    stripeCurrentPeriodEnd: inHours(48), cancelAtPeriodEnd: false,
    renewalReminderPeriodEnd: null, accountType: 'STANDARD',
    frequency: 'MONTHLY', stripePriceId: 'price_x',
    userEmail: 'a@b.com', userFullName: 'Ana',
    ...over,
  }
}

describe('selectSubscriptionsToRemind', () => {
  const LEAD = RENEWAL_REMINDER_LEAD_HOURS
  it('incluye una ACTIVE dentro de la ventana [now, now+72h]', () => {
    expect(selectSubscriptionsToRemind([cand()], now, LEAD).map(s => s.id)).toEqual(['sub_1'])
  })
  it('excluye si el periodo termina a >72h o ya pasó', () => {
    expect(selectSubscriptionsToRemind([cand({ stripeCurrentPeriodEnd: inHours(80) })], now, LEAD)).toEqual([])
    expect(selectSubscriptionsToRemind([cand({ stripeCurrentPeriodEnd: inHours(-1) })], now, LEAD)).toEqual([])
  })
  it('excluye TRIALING / PAST_DUE / CANCELLED', () => {
    for (const status of ['TRIALING', 'PAST_DUE', 'CANCELLED', 'UNPAID']) {
      expect(selectSubscriptionsToRemind([cand({ status })], now, LEAD)).toEqual([])
    }
  })
  it('excluye partner, cancelAtPeriodEnd y sin stripeSubscriptionId / sin periodEnd', () => {
    expect(selectSubscriptionsToRemind([cand({ accountType: 'PARTNER' })], now, LEAD)).toEqual([])
    expect(selectSubscriptionsToRemind([cand({ cancelAtPeriodEnd: true })], now, LEAD)).toEqual([])
    expect(selectSubscriptionsToRemind([cand({ stripeSubscriptionId: null })], now, LEAD)).toEqual([])
    expect(selectSubscriptionsToRemind([cand({ stripeCurrentPeriodEnd: null })], now, LEAD)).toEqual([])
  })
  it('dedup: excluye si ya se avisó para ese mismo periodEnd; incluye si difiere', () => {
    const pe = inHours(48)
    expect(selectSubscriptionsToRemind(
      [cand({ stripeCurrentPeriodEnd: pe, renewalReminderPeriodEnd: pe })], now, LEAD)).toEqual([])
    expect(selectSubscriptionsToRemind(
      [cand({ stripeCurrentPeriodEnd: pe, renewalReminderPeriodEnd: inHours(-720) })], now, LEAD).map(s => s.id),
    ).toEqual(['sub_1'])
  })
})

describe('renewalPlanLabel', () => {
  it('mensual vs anual', () => {
    expect(renewalPlanLabel('MONTHLY', 'month')).toBe('Mensual')
    expect(renewalPlanLabel('WEEKLY', 'month')).toBe('Semanal')
    expect(renewalPlanLabel('BIWEEKLY', 'month')).toBe('Quincenal')
    expect(renewalPlanLabel('DAILY', 'month')).toBe('Diario')
    expect(renewalPlanLabel('MONTHLY', 'year')).toBe('Mensual (facturación anual)')
  })
})

describe('formatRenewalDate', () => {
  it('formatea en es-MX legible', () => {
    expect(formatRenewalDate(new Date('2026-10-15T09:00:00Z'))).toMatch(/15 de octubre de 2026/)
  })
})
