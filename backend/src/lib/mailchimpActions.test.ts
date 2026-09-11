import { describe, it, expect } from 'vitest'
import {
  planTagForFrequency, splitName, tagsForReason, shouldEnqueueTrialSync,
} from './mailchimpActions'

describe('planTagForFrequency', () => {
  it('mapea cada frecuencia', () => {
    expect(planTagForFrequency('DAILY')).toBe('plan-diario')
    expect(planTagForFrequency('WEEKLY')).toBe('plan-semanal')
    expect(planTagForFrequency('BIWEEKLY')).toBe('plan-quincenal')
    expect(planTagForFrequency('MONTHLY')).toBe('plan-mensual')
  })
})

describe('splitName', () => {
  it('parte por el primer espacio', () => {
    expect(splitName('Ana María Pérez')).toEqual({ firstName: 'Ana', lastName: 'María Pérez' })
    expect(splitName('Ana')).toEqual({ firstName: 'Ana' })
    expect(splitName(null)).toEqual({})
    expect(splitName('   ')).toEqual({})
  })
})

describe('tagsForReason', () => {
  it('registered / trial / cancelled', () => {
    expect(tagsForReason('registered', {})).toEqual(['estado-registrado'])
    expect(tagsForReason('trial', {})).toEqual(['estado-trial'])
    expect(tagsForReason('cancelled', {})).toEqual(['estado-cancelado'])
  })
  it('paid incluye el plan si hay frecuencia', () => {
    expect(tagsForReason('paid', { frequency: 'MONTHLY' })).toEqual(['estado-activo', 'plan-mensual'])
    expect(tagsForReason('paid', { frequency: null })).toEqual(['estado-activo'])
  })
})

describe('shouldEnqueueTrialSync', () => {
  const base = { accountType: 'STANDARD', mailchimpSyncedAt: new Date(), mailchimpTrialTaggedAt: null }
  it('true solo si STANDARD, sincronizado y sin tag de trial', () => {
    expect(shouldEnqueueTrialSync(base)).toBe(true)
    expect(shouldEnqueueTrialSync({ ...base, accountType: 'PARTNER' })).toBe(false)
    expect(shouldEnqueueTrialSync({ ...base, mailchimpSyncedAt: null })).toBe(false)
    expect(shouldEnqueueTrialSync({ ...base, mailchimpTrialTaggedAt: new Date() })).toBe(false)
  })
})
