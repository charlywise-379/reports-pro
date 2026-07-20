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
