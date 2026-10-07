import Stripe from 'stripe'
import { getSecret, secretsVersion } from './config'
type StripeClient = InstanceType<typeof Stripe>

const API_VERSION = '2024-06-20' as any

export function createStripeClient(secretKey: string): StripeClient {
  return new Stripe(secretKey, { apiVersion: API_VERSION })
}

let cached: { v: number; key: string; client: StripeClient } | null = null

// Cliente de Stripe con la llave vigente (override de /operations/secrets o
// Railway). Se reconstruye solo cuando la llave cambia.
export function getStripe(): StripeClient {
  const key = getSecret('STRIPE_SECRET_KEY')
  if (!key) throw new Error('STRIPE_SECRET_KEY no configurada')
  const v = secretsVersion()
  if (!cached || cached.v !== v || cached.key !== key) {
    cached = { v, key, client: createStripeClient(key) }
  }
  return cached.client
}

// Compatibilidad: los módulos que hacen `import { stripe }` siguen
// funcionando; cada acceso (stripe.checkout, stripe.subscriptions, …)
// delega en el cliente vigente.
export const stripe = new Proxy({} as StripeClient, {
  get(_target, prop) {
    const client = getStripe() as any
    const value = client[prop]
    return typeof value === 'function' ? value.bind(client) : value
  },
})
