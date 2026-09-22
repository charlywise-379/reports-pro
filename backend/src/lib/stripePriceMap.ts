// Precios reales del landing (USD): mensual $49, quincenal $79, semanal $99,
// diario $149. Los planes anuales cobran 12x el precio mensual con 20% de
// descuento ya aplicado — aquí se registra ese EQUIVALENTE MENSUAL (no el
// cargo anual total), porque este mapa alimenta `pricePerMonth`, usado para
// calcular MRR en el dashboard de operaciones.
const PRICE_TO_AMOUNT_USD: Record<string, number> = {}

function register(envVar: string | undefined, amount: number) {
  if (envVar) PRICE_TO_AMOUNT_USD[envVar] = amount
}

register(process.env.STRIPE_PRICE_MONTHLY, 49.00)
register(process.env.STRIPE_PRICE_BIWEEKLY, 79.00)
register(process.env.STRIPE_PRICE_WEEKLY, 99.00)
register(process.env.STRIPE_PRICE_DAILY, 149.00)
register(process.env.STRIPE_PRICE_MONTHLY_ANNUAL, 39.20)
register(process.env.STRIPE_PRICE_BIWEEKLY_ANNUAL, 63.20)
register(process.env.STRIPE_PRICE_WEEKLY_ANNUAL, 79.20)
register(process.env.STRIPE_PRICE_DAILY_ANNUAL, 119.20)

export function getPriceAmountUSD(priceId: string | undefined | null): number {
  if (!priceId) return 49
  return PRICE_TO_AMOUNT_USD[priceId] ?? 49
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
