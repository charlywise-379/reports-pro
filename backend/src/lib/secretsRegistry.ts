// Allowlist de llaves editables desde /operations/secrets. Una llave SOLO
// se agrega aquí cuando su integración ya la lee vía getSecret() — si no,
// la UI ofrecería editar algo que no surte efecto. Las llaves de arranque
// (BD, Redis, JWT, Supabase, master key) y de red (FRONTEND_URL...) nunca
// van aquí: romperlas desde el backoffice deja fuera al propio backoffice.

export type SecretGroup = 'stripe' | 'resend' | 'anthropic' | 'twilio' | 'mailchimp' | 'cloudflare' | 'pdf'

export type SecretDef = {
  key: string
  group: SecretGroup
  label: string
  /** false = ID no secreto, se muestra completo para poder verificarlo */
  sensitive: boolean
  /** devuelve un mensaje de error, o null si el formato es válido */
  validate?: (v: string) => string | null
}

export const GROUP_LABELS: Record<SecretGroup, string> = {
  stripe: 'Stripe',
  resend: 'Resend (email)',
  anthropic: 'Anthropic (IA)',
  twilio: 'Twilio (WhatsApp)',
  mailchimp: 'Mailchimp',
  cloudflare: 'Cloudflare / R2',
  pdf: 'Generación de PDF',
}

const prefix = (p: string[], msg: string) => (v: string) => (p.some(x => v.startsWith(x)) ? null : msg)

const priceDef = (key: string, label: string): SecretDef => ({
  key, group: 'stripe', label, sensitive: false,
  validate: prefix(['price_'], 'El ID de precio de Stripe debe empezar con price_'),
})

export const SECRET_DEFS: SecretDef[] = [
  {
    key: 'STRIPE_SECRET_KEY', group: 'stripe', label: 'Llave secreta', sensitive: true,
    validate: prefix(['sk_live_', 'sk_test_'], 'La llave de Stripe debe empezar con sk_live_ o sk_test_ (no uses la publishable pk_ ni una restricted rk_)'),
  },
  {
    key: 'STRIPE_WEBHOOK_SECRET', group: 'stripe', label: 'Secreto del webhook', sensitive: true,
    validate: prefix(['whsec_'], 'El secreto del webhook debe empezar con whsec_'),
  },
  priceDef('STRIPE_PRICE_MONTHLY', 'Precio Mensual (pago mensual)'),
  priceDef('STRIPE_PRICE_BIWEEKLY', 'Precio Quincenal (pago mensual)'),
  priceDef('STRIPE_PRICE_WEEKLY', 'Precio Semanal (pago mensual)'),
  priceDef('STRIPE_PRICE_DAILY', 'Precio Diario (pago mensual)'),
  priceDef('STRIPE_PRICE_MONTHLY_ANNUAL', 'Precio Mensual (pago anual)'),
  priceDef('STRIPE_PRICE_BIWEEKLY_ANNUAL', 'Precio Quincenal (pago anual)'),
  priceDef('STRIPE_PRICE_WEEKLY_ANNUAL', 'Precio Semanal (pago anual)'),
  priceDef('STRIPE_PRICE_DAILY_ANNUAL', 'Precio Diario (pago anual)'),
]

const BY_KEY = new Map(SECRET_DEFS.map(d => [d.key, d]))

export function getSecretDef(key: string): SecretDef | undefined {
  return BY_KEY.get(key)
}

export function isEditableKey(key: string): boolean {
  return BY_KEY.has(key)
}

export const MAX_SECRET_LENGTH = 500

export function validateSecretValue(
  key: string,
  raw: unknown,
): { ok: true; value: string } | { ok: false; error: string } {
  const def = getSecretDef(key)
  if (!def) return { ok: false, error: 'Esta llave no se puede editar desde el backoffice' }
  if (typeof raw !== 'string') return { ok: false, error: 'El valor debe ser texto' }
  const value = raw.trim()
  if (!value) return { ok: false, error: 'El valor no puede estar vacío' }
  if (value.length > MAX_SECRET_LENGTH) return { ok: false, error: `Máximo ${MAX_SECRET_LENGTH} caracteres` }
  const err = def.validate?.(value)
  return err ? { ok: false, error: err } : { ok: true, value }
}

export function maskValue(value: string, sensitive: boolean): string {
  if (!sensitive) return value
  if (value.length <= 8) return '••••'
  return '••••' + value.slice(-4)
}

export function detectMode(key: string, value: string): 'test' | 'live' | undefined {
  if (key !== 'STRIPE_SECRET_KEY') return undefined
  if (value.startsWith('sk_live_')) return 'live'
  if (value.startsWith('sk_test_')) return 'test'
  return undefined
}
