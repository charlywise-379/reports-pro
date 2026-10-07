import { getSecret } from './config'

// Precios reales del landing (USD): mensual $49, quincenal $79, semanal $99,
// diario $149. Los planes anuales cobran 12x el precio mensual con 20% de
// descuento ya aplicado — aquí se registra ese EQUIVALENTE MENSUAL (no el
// cargo anual total), porque este mapa alimenta `pricePerMonth`, usado para
// calcular MRR en el dashboard de operaciones.
//
// Los IDs se leen en cada llamada vía getSecret(): un cambio hecho desde
// /operations/secrets aplica sin reiniciar.

export type PlanKey = 'monthly' | 'biweekly' | 'weekly' | 'daily'
export type BillingCycle = 'monthly' | 'annual'

const PLANS: Record<PlanKey, { monthlyKey: string; annualKey: string; usd: number; annualMonthlyUsd: number }> = {
  monthly: { monthlyKey: 'STRIPE_PRICE_MONTHLY', annualKey: 'STRIPE_PRICE_MONTHLY_ANNUAL', usd: 49.0, annualMonthlyUsd: 39.2 },
  biweekly: { monthlyKey: 'STRIPE_PRICE_BIWEEKLY', annualKey: 'STRIPE_PRICE_BIWEEKLY_ANNUAL', usd: 79.0, annualMonthlyUsd: 63.2 },
  weekly: { monthlyKey: 'STRIPE_PRICE_WEEKLY', annualKey: 'STRIPE_PRICE_WEEKLY_ANNUAL', usd: 99.0, annualMonthlyUsd: 79.2 },
  daily: { monthlyKey: 'STRIPE_PRICE_DAILY', annualKey: 'STRIPE_PRICE_DAILY_ANNUAL', usd: 149.0, annualMonthlyUsd: 119.2 },
}

function isPlanKey(v: string): v is PlanKey {
  return Object.prototype.hasOwnProperty.call(PLANS, v)
}

/** Precio mensual de lista (USD) de un plan — con pago anual, el equivalente
 * mensual con el 20% de descuento. undefined si el plan no existe. */
export function getPlanMonthlyUSD(plan: string, billing: BillingCycle = 'monthly'): number | undefined {
  if (!isPlanKey(plan)) return undefined
  return billing === 'annual' ? PLANS[plan].annualMonthlyUsd : PLANS[plan].usd
}

/** priceId de Stripe para un plan y ciclo; undefined si es inválido o no está configurado. */
export function resolvePriceId(plan: string, billing: string): string | undefined {
  if (!isPlanKey(plan)) return undefined
  if (billing !== 'monthly' && billing !== 'annual') return undefined
  const p = PLANS[plan]
  return getSecret(billing === 'annual' ? p.annualKey : p.monthlyKey)
}

/** Los priceIds configurados hoy (los 8, omitiendo los vacíos). */
export function configuredPriceIds(): string[] {
  const ids: string[] = []
  for (const p of Object.values(PLANS)) {
    const m = getSecret(p.monthlyKey); if (m) ids.push(m)
    const a = getSecret(p.annualKey); if (a) ids.push(a)
  }
  return ids
}

export function getPriceAmountUSD(priceId: string | undefined | null): number {
  if (!priceId) return 49
  for (const p of Object.values(PLANS)) {
    if (getSecret(p.monthlyKey) === priceId) return p.usd
    if (getSecret(p.annualKey) === priceId) return p.annualMonthlyUsd
  }
  return 49
}

// 'year' solo si el priceId coincide con un STRIPE_PRICE_*_ANNUAL configurado;
// si no, se etiqueta como 'month' (solo afecta el texto del email de
// renovación, no la lógica de envío).
export function getBillingInterval(priceId: string | null | undefined): 'month' | 'year' {
  if (!priceId) return 'month'
  for (const p of Object.values(PLANS)) {
    if (getSecret(p.annualKey) === priceId) return 'year'
  }
  return 'month'
}
