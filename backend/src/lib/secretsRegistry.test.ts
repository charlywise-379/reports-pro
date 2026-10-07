import { describe, it, expect } from 'vitest'
import { SECRET_DEFS, isEditableKey, validateSecretValue, maskValue, detectMode } from './secretsRegistry'

describe('allowlist', () => {
  it('incluye las 10 llaves de Stripe', () => {
    const stripe = SECRET_DEFS.filter(d => d.group === 'stripe').map(d => d.key).sort()
    expect(stripe).toEqual([
      'STRIPE_PRICE_BIWEEKLY', 'STRIPE_PRICE_BIWEEKLY_ANNUAL', 'STRIPE_PRICE_DAILY', 'STRIPE_PRICE_DAILY_ANNUAL',
      'STRIPE_PRICE_MONTHLY', 'STRIPE_PRICE_MONTHLY_ANNUAL', 'STRIPE_PRICE_WEEKLY', 'STRIPE_PRICE_WEEKLY_ANNUAL',
      'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
    ])
  })

  it('nunca incluye llaves de arranque/red', () => {
    for (const k of ['DATABASE_URL', 'DIRECT_URL', 'REDIS_URL', 'ADMIN_JWT_SECRET', 'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY', 'SECRETS_MASTER_KEY', 'FRONTEND_URL', 'BACKEND_URL', 'PORT', 'NODE_ENV',
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY']) {
      expect(isEditableKey(k)).toBe(false)
    }
  })
})

describe('validateSecretValue', () => {
  it('recorta espacios y saltos de línea', () => {
    expect(validateSecretValue('STRIPE_SECRET_KEY', '  sk_live_abc123\n')).toEqual({ ok: true, value: 'sk_live_abc123' })
  })
  it('rechaza formato de Stripe inválido', () => {
    const r = validateSecretValue('STRIPE_SECRET_KEY', 'pk_live_abc')
    expect(r.ok).toBe(false)
  })
  it('acepta sk_test_ y whsec_ y price_', () => {
    expect(validateSecretValue('STRIPE_SECRET_KEY', 'sk_test_x').ok).toBe(true)
    expect(validateSecretValue('STRIPE_WEBHOOK_SECRET', 'whsec_x').ok).toBe(true)
    expect(validateSecretValue('STRIPE_PRICE_DAILY', 'price_1Abc').ok).toBe(true)
    expect(validateSecretValue('STRIPE_PRICE_DAILY', 'prod_1Abc').ok).toBe(false)
  })
  it('rechaza vacío, no-string, >500 y llave fuera de la allowlist', () => {
    expect(validateSecretValue('STRIPE_SECRET_KEY', '   ').ok).toBe(false)
    expect(validateSecretValue('STRIPE_SECRET_KEY', 123).ok).toBe(false)
    expect(validateSecretValue('STRIPE_SECRET_KEY', 'sk_live_' + 'a'.repeat(500)).ok).toBe(false)
    expect(validateSecretValue('DATABASE_URL', 'postgres://x').ok).toBe(false)
  })
})

describe('maskValue', () => {
  it('muestra solo los últimos 4 en sensibles', () => {
    expect(maskValue('sk_live_abcdWXYZ', true)).toBe('••••WXYZ')
  })
  it('valores cortos (≤8) quedan totalmente ocultos', () => {
    expect(maskValue('12345678', true)).toBe('••••')
  })
  it('no sensibles se muestran completos', () => {
    expect(maskValue('price_1Abc', false)).toBe('price_1Abc')
  })
})

describe('detectMode', () => {
  it('detecta test/live solo en STRIPE_SECRET_KEY', () => {
    expect(detectMode('STRIPE_SECRET_KEY', 'sk_live_x')).toBe('live')
    expect(detectMode('STRIPE_SECRET_KEY', 'sk_test_x')).toBe('test')
    expect(detectMode('STRIPE_PRICE_DAILY', 'price_x')).toBeUndefined()
  })
})
