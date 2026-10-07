import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { randomBytes } from 'crypto'
import { encryptSecret } from './secretsCrypto'
import { loadSecrets, __resetSecretsForTests } from './config'
import { getBillingInterval, getPriceAmountUSD, resolvePriceId, configuredPriceIds, getPlanMonthlyUSD } from './stripePriceMap'

const OLD_ENV = { ...process.env }
const master = randomBytes(32)

beforeEach(() => {
  __resetSecretsForTests()
  process.env = {
    ...OLD_ENV,
    SECRETS_MASTER_KEY: master.toString('base64'),
    STRIPE_PRICE_MONTHLY: 'price_month_x',
    STRIPE_PRICE_MONTHLY_ANNUAL: 'price_year_x',
  }
  delete process.env.STRIPE_PRICE_DAILY
})
afterEach(() => { process.env = { ...OLD_ENV } })

describe('getBillingInterval', () => {
  it("'year' para un price anual conocido", () => {
    expect(getBillingInterval('price_year_x')).toBe('year')
  })
  it("'month' para un price mensual o desconocido o vacío", () => {
    expect(getBillingInterval('price_month_x')).toBe('month')
    expect(getBillingInterval('price_desconocido')).toBe('month')
    expect(getBillingInterval(null)).toBe('month')
    expect(getBillingInterval(undefined)).toBe('month')
  })
})

describe('getPriceAmountUSD', () => {
  it('monto mensual y equivalente mensual del anual', () => {
    expect(getPriceAmountUSD('price_month_x')).toBe(49)
    expect(getPriceAmountUSD('price_year_x')).toBe(39.2)
  })
})

describe('resolvePriceId', () => {
  it('resuelve por plan y ciclo', () => {
    expect(resolvePriceId('monthly', 'monthly')).toBe('price_month_x')
    expect(resolvePriceId('monthly', 'annual')).toBe('price_year_x')
  })
  it('undefined para plan/ciclo inválido o sin configurar', () => {
    expect(resolvePriceId('daily', 'monthly')).toBeUndefined()
    expect(resolvePriceId('hackeado', 'monthly')).toBeUndefined()
    expect(resolvePriceId('monthly', 'semestral')).toBeUndefined()
  })
  it('refleja un override de BD sin reiniciar', async () => {
    await loadSecrets(async () => [{ key: 'STRIPE_PRICE_MONTHLY', ciphertext: encryptSecret('price_nuevo', master) }])
    expect(resolvePriceId('monthly', 'monthly')).toBe('price_nuevo')
    expect(getPriceAmountUSD('price_nuevo')).toBe(49)
    expect(configuredPriceIds()).toContain('price_nuevo')
  })
})

describe('getPlanMonthlyUSD', () => {
  it('precio de lista por plan, igual que el landing', () => {
    expect(getPlanMonthlyUSD('monthly')).toBe(49)
    expect(getPlanMonthlyUSD('biweekly')).toBe(79)
    expect(getPlanMonthlyUSD('weekly')).toBe(99)
    expect(getPlanMonthlyUSD('daily')).toBe(149)
  })
  it('undefined para un plan desconocido', () => {
    expect(getPlanMonthlyUSD('hourly')).toBeUndefined()
  })
  it('con pago anual aplica el 20% de descuento', () => {
    expect(getPlanMonthlyUSD('monthly', 'annual')).toBe(39.2)
    expect(getPlanMonthlyUSD('biweekly', 'annual')).toBe(63.2)
    expect(getPlanMonthlyUSD('weekly', 'annual')).toBe(79.2)
    expect(getPlanMonthlyUSD('daily', 'annual')).toBe(119.2)
  })
})
