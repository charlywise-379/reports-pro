import { createHash } from 'crypto'
import { getSecret } from './config'

// Cliente mínimo de Mailchimp Marketing API v3 sobre fetch (sin SDK).
// Si falta MAILCHIMP_API_KEY, todo es no-op silencioso.

function apiKey(): string {
  return getSecret('MAILCHIMP_API_KEY') || ''
}
function audienceId(): string {
  return getSecret('MAILCHIMP_AUDIENCE_ID') || ''
}
function datacenter(): string | null {
  const key = apiKey()
  const dash = key.lastIndexOf('-')
  if (dash === -1) return null
  const dc = key.slice(dash + 1)
  return /^us\d+$/.test(dc) ? dc : null
}

export function isMailchimpEnabled(): boolean {
  return !!apiKey() && !!datacenter() && !!audienceId()
}

let warnedDisabled = false
function warnDisabledOnce() {
  if (!warnedDisabled) {
    console.log('[mailchimp] deshabilitado — MAILCHIMP_API_KEY / MAILCHIMP_AUDIENCE_ID no configuradas; se omite el sync')
    warnedDisabled = true
  }
}

export function subscriberHash(email: string): string {
  return createHash('md5').update(email.trim().toLowerCase()).digest('hex')
}

class MailchimpRetryableError extends Error {}

// true solo si Mailchimp aceptó la petición; false si está deshabilitado o hubo error permanente (4xx).
// Errores transitorios (red, 429, 5xx) lanzan para que la cola reintente.
async function mcRequest(path: string, method: 'GET' | 'PUT' | 'POST', body?: unknown): Promise<boolean> {
  if (!isMailchimpEnabled()) {
    warnDisabledOnce()
    return false
  }
  const url = `https://${datacenter()}.api.mailchimp.com/3.0${path}`
  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + Buffer.from('anystring:' + apiKey()).toString('base64'),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (e: any) {
    throw new MailchimpRetryableError(`mailchimp network error: ${e?.message || e}`)
  }
  if (res.ok) return true
  const text = await res.text().catch(() => '')
  if (res.status === 429 || res.status >= 500) {
    throw new MailchimpRetryableError(`mailchimp ${res.status}: ${text.slice(0, 300)}`)
  }
  console.warn(`[mailchimp] error permanente ${res.status} en ${method} ${path}: ${text.slice(0, 300)}`)
  return false
}

export async function upsertMember(p: {
  email: string
  firstName?: string
  lastName?: string
  company?: string | null
}): Promise<boolean> {
  const merge_fields: Record<string, string> = {}
  if (p.firstName) merge_fields.FNAME = p.firstName
  if (p.lastName) merge_fields.LNAME = p.lastName
  if (p.company) merge_fields.COMPANY = p.company

  return mcRequest(
    `/lists/${audienceId()}/members/${subscriberHash(p.email)}`,
    'PUT',
    {
      email_address: p.email,
      status_if_new: 'subscribed',
      ...(Object.keys(merge_fields).length > 0 ? { merge_fields } : {}),
    },
  )
}

export async function addTags(email: string, tags: string[]): Promise<boolean> {
  if (!tags.length) return true
  return mcRequest(
    `/lists/${audienceId()}/members/${subscriberHash(email)}/tags`,
    'POST',
    { tags: tags.map(name => ({ name, status: 'active' })) },
  )
}
