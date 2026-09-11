import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const OLD_ENV = { ...process.env }
async function fresh() { vi.resetModules(); return import('./stripePriceMap') }

beforeEach(() => {
  process.env.STRIPE_PRICE_MONTHLY = 'price_month_x'
  process.env.STRIPE_PRICE_MONTHLY_ANNUAL = 'price_year_x'
})
afterEach(() => { process.env = { ...OLD_ENV } })

describe('getBillingInterval', () => {
  it("'year' para un price anual conocido", async () => {
    const { getBillingInterval } = await fresh()
    expect(getBillingInterval('price_year_x')).toBe('year')
  })
  it("'month' para un price mensual o desconocido o vacío", async () => {
    const { getBillingInterval } = await fresh()
    expect(getBillingInterval('price_month_x')).toBe('month')
    expect(getBillingInterval('price_desconocido')).toBe('month')
    expect(getBillingInterval(null)).toBe('month')
    expect(getBillingInterval(undefined)).toBe('month')
  })
})
