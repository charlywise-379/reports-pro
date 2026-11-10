import { describe, it, expect } from 'vitest'
import { selectUsersToRemind, isFriendlyHour, onboardingUrlFor, type OnboardingCandidate } from './sendOnboardingReminders'
import { buildOnboardingReminderEmail, firstNameOf } from '../lib/onboardingReminderEmail'

const now = new Date('2026-11-10T18:00:00Z') // 12:00 en CDMX
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000)

function cand(over: Partial<OnboardingCandidate> = {}): OnboardingCandidate {
  return {
    id: 'u1', email: 'ana@empresa.mx', fullName: 'Ana López', company: 'Empresa', createdAt: hoursAgo(30),
    isSuspended: false, confirmed: true, hasConfiguredProject: false, alreadyReminded: false, pendingProjectId: null,
    ...over,
  }
}

describe('selectUsersToRemind', () => {
  it('recuerda a un usuario confirmado, sin onboarding, registrado hace más de 24 h', () => {
    expect(selectUsersToRemind([cand()], now)).toHaveLength(1)
  })
  it('respeta la ventana de 24 h a 7 días', () => {
    expect(selectUsersToRemind([cand({ createdAt: hoursAgo(23) })], now)).toHaveLength(0)
    expect(selectUsersToRemind([cand({ createdAt: hoursAgo(24) })], now)).toHaveLength(1)
    expect(selectUsersToRemind([cand({ createdAt: hoursAgo(7 * 24 + 1) })], now)).toHaveLength(0)
  })
  it('excluye onboarding completo, ya recordados, sin confirmar y suspendidos', () => {
    expect(selectUsersToRemind([
      cand({ hasConfiguredProject: true }), cand({ alreadyReminded: true }),
      cand({ confirmed: false }), cand({ isSuspended: true }), cand({ email: '' }),
    ], now)).toHaveLength(0)
  })
})

describe('horario y enlace', () => {
  it('solo envía de 9:00 a 19:59 en CDMX', () => {
    expect(isFriendlyHour(new Date('2026-11-10T15:00:00Z'))).toBe(true)  // 9:00
    expect(isFriendlyHour(new Date('2026-11-11T01:59:00Z'))).toBe(true)  // 19:59
    expect(isFriendlyHour(new Date('2026-11-11T02:00:00Z'))).toBe(false) // 20:00
    expect(isFriendlyHour(new Date('2026-11-10T14:59:00Z'))).toBe(false) // 8:59
  })
  it('lleva al proyecto pendiente si existe', () => {
    expect(onboardingUrlFor('https://omnireports.pro', 'p1')).toBe('https://omnireports.pro/onboarding?projectId=p1')
    expect(onboardingUrlFor('https://omnireports.pro', null)).toBe('https://omnireports.pro/onboarding')
  })
})

describe('correo de recordatorio', () => {
  it('personaliza con el nombre y la empresa, y trae versión de texto', () => {
    const m = buildOnboardingReminderEmail({ fullName: 'ana lópez', company: 'Empresa <SA>', onboardingUrl: 'https://omnireports.pro/onboarding?projectId=p1' })
    expect(m.subject).toContain('Ana')
    expect(m.html).toContain('¡Hola, Ana!')
    expect(m.html).toContain('Empresa &lt;SA&gt;')
    expect(m.html).toContain('v:roundrect')
    expect(m.html).toContain('https://omnireports.pro/onboarding?projectId=p1')
    expect(m.text).toContain('https://omnireports.pro/onboarding?projectId=p1')
  })
  it('funciona sin nombre ni empresa', () => {
    const m = buildOnboardingReminderEmail({ fullName: null, company: null, onboardingUrl: 'https://x/onboarding' })
    expect(m.html).toContain('¡Hola!')
    expect(firstNameOf('  ')).toBeNull()
  })
})
