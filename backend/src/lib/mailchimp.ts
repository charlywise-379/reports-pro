import { createHash } from 'crypto'

// Cliente mínimo de Mailchimp Marketing API v3 sobre fetch (sin SDK).
// Si falta MAILCHIMP_API_KEY, todo es no-op silencioso.

function apiKey(): string {
  return process.env.MAILCHIMP_API_KEY || ''
}
function audienceId(): string {
  return process.env.MAILCHIMP_AUDIENCE_ID || ''
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

async function mcRequest(path: string, method: 'GET' | 'PUT' | 'POST', body?: unknown): Promise<void> {
  if (!isMailchimpEnabled()) {
    warnDisabledOnce()
    return
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
  if (res.ok) return
  const text = await res.text().catch(() => '')
  if (res.status === 429 || res.status >= 500) {
    throw new MailchimpRetryableError(`mailchimp ${res.status}: ${text.slice(0, 300)}`)
  }
  console.warn(`[mailchimp] error permanente ${res.status} en ${method} ${path}: ${text.slice(0, 300)}`)
}

export async function upsertMember(p: {
  email: string
  firstName?: string
  lastName?: string
  company?: string | null
}): Promise<void> {
  const merge_fields: Record<string, string> = {}
  if (p.firstName) merge_fields.FNAME = p.firstName
  if (p.lastName) merge_fields.LNAME = p.lastName
  if (p.company) merge_fields.COMPANY = p.company

  await mcRequest(
    `/lists/${audienceId()}/members/${subscriberHash(p.email)}`,
    'PUT',
    {
      email_address: p.email,
      status_if_new: 'subscribed',
      ...(Object.keys(merge_fields).length > 0 ? { merge_fields } : {}),
    },
  )
}

export async function addTags(email: string, tags: string[]): Promise<void> {
  if (!tags.length) return
  await mcRequest(
    `/lists/${audienceId()}/members/${subscriberHash(email)}/tags`,
    'POST',
    { tags: tags.map(name => ({ name, status: 'active' })) },
  )
}
