import { Resend } from 'resend'
import Anthropic from '@anthropic-ai/sdk'
import { createStripeClient, getStripe } from './stripe'

// Pruebas de conexión de SOLO LECTURA por llave. Lanzan un Error con un
// mensaje legible si la llave no funciona. Las llaves sin prueba posible
// (p. ej. el secreto del webhook) no tienen entrada aquí.

const TIMEOUT_MS = 10_000

function withTimeout<T>(p: Promise<T>): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado (10 s)')), TIMEOUT_MS)),
  ])
}

async function testStripePrice(priceId: string) {
  const price = await getStripe().prices.retrieve(priceId)
  if (!price.active) throw new Error('El precio existe pero está archivado (inactive) en Stripe')
  if (price.currency !== 'usd') throw new Error(`El precio está en ${price.currency.toUpperCase()}, se esperaba USD`)
}

const TESTERS: Record<string, (value: string) => Promise<void>> = {
  STRIPE_SECRET_KEY: async (v) => { await createStripeClient(v).balance.retrieve() },
  STRIPE_PRICE_MONTHLY: testStripePrice,
  STRIPE_PRICE_BIWEEKLY: testStripePrice,
  STRIPE_PRICE_WEEKLY: testStripePrice,
  STRIPE_PRICE_DAILY: testStripePrice,
  STRIPE_PRICE_MONTHLY_ANNUAL: testStripePrice,
  STRIPE_PRICE_BIWEEKLY_ANNUAL: testStripePrice,
  STRIPE_PRICE_WEEKLY_ANNUAL: testStripePrice,
  STRIPE_PRICE_DAILY_ANNUAL: testStripePrice,
  RESEND_API_KEY: async (v) => {
    const { error } = await new Resend(v).domains.list()
    if (error) throw new Error(error.message)
  },
  ANTHROPIC_API_KEY: async (v) => { await new Anthropic({ apiKey: v }).models.list({ limit: 1 }) },
  MAILCHIMP_API_KEY: async (v) => {
    const dc = v.split('-').pop()
    const r = await fetch(`https://${dc}.api.mailchimp.com/3.0/ping`, { headers: { Authorization: `apikey ${v}` } })
    if (!r.ok) throw new Error(`Mailchimp respondió ${r.status}`)
  },
}

export function hasTester(key: string): boolean {
  return key in TESTERS
}

export async function runSecretTest(key: string, value: string): Promise<void> {
  const t = TESTERS[key]
  if (!t) throw new Error('Esta llave no tiene prueba de conexión')
  try {
    await withTimeout(t(value))
  } catch (e: any) {
    throw new Error(e?.message || 'La prueba falló')
  }
}

// Advertencias al guardar una llave nueva (no bloquean el guardado).
export async function warningsForNewValue(key: string, value: string, priceIds: string[]): Promise<string[]> {
  if (key !== 'STRIPE_SECRET_KEY' || priceIds.length === 0) return []
  try {
    await withTimeout(createStripeClient(value).prices.retrieve(priceIds[0]))
    return []
  } catch {
    return ['Con esta llave no se encontraron los precios configurados. Si cambiaste entre modo test y live, actualiza también los 8 precios o el checkout fallará.']
  }
}
