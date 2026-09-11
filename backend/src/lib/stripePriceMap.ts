const PRICE_TO_AMOUNT_MXN: Record<string, number> = {}

function register(envVar: string | undefined, amount: number) {
  if (envVar) PRICE_TO_AMOUNT_MXN[envVar] = amount
}

register(process.env.STRIPE_PRICE_DAILY, 29.99)
register(process.env.STRIPE_PRICE_WEEKLY, 25.00)
register(process.env.STRIPE_PRICE_BIWEEKLY, 22.00)
register(process.env.STRIPE_PRICE_MONTHLY, 20.00)
register(process.env.STRIPE_PRICE_DAILY_ANNUAL, 29.99)
register(process.env.STRIPE_PRICE_WEEKLY_ANNUAL, 25.00)
register(process.env.STRIPE_PRICE_BIWEEKLY_ANNUAL, 22.00)
register(process.env.STRIPE_PRICE_MONTHLY_ANNUAL, 20.00)

export function getPriceAmountMXN(priceId: string | undefined | null): number {
  if (!priceId) return 49
  return PRICE_TO_AMOUNT_MXN[priceId] ?? 49
}

const ANNUAL_PRICE_IDS = new Set(
  [
    process.env.STRIPE_PRICE_DAILY_ANNUAL,
    process.env.STRIPE_PRICE_WEEKLY_ANNUAL,
    process.env.STRIPE_PRICE_BIWEEKLY_ANNUAL,
    process.env.STRIPE_PRICE_MONTHLY_ANNUAL,
  ].filter(Boolean) as string[],
)

// 'year' solo si el priceId coincide con una env *_ANNUAL configurada; si
// esas envs no están, un plan anual se etiqueta como 'month' (solo afecta
// el texto del email de renovación, no la lógica de envío).
export function getBillingInterval(priceId: string | null | undefined): 'month' | 'year' {
  if (priceId && ANNUAL_PRICE_IDS.has(priceId)) return 'year'
  return 'month'
}
