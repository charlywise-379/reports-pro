import { createHash } from 'crypto'
import { getSecret } from './config'

// Meta Conversions API (eventos del servidor). Se usa para lo que el píxel del navegador no puede ver: el primer
// cobro real de una suscripción, que ocurre en Stripe al terminar la prueba, sin el usuario en el sitio.
// Sin META_CAPI_ACCESS_TOKEN todo es no-op. Docs: POST https://graph.facebook.com/{ver}/{pixel}/events
// (data[], user_data con em/external_id en SHA-256; fbp, fbc, IP y user agent sin hash; dedupe por event_id + event_name).

export const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v27.0'
const DEFAULT_PIXEL_ID = '1886959832294707'

export function metaPixelId(): string {
  return getSecret('META_PIXEL_ID') || DEFAULT_PIXEL_ID
}
export function isMetaCapiEnabled(): boolean {
  return !!getSecret('META_CAPI_ACCESS_TOKEN') && !!metaPixelId()
}

export const sha256 = (v: string) => createHash('sha256').update(v.trim().toLowerCase()).digest('hex')

/** Datos del navegador que se guardan al crear el checkout para mejorar la coincidencia del evento del servidor. */
export interface MetaBrowserContext { fbp?: string; fbc?: string; ip?: string; ua?: string }

const META_COOKIE = /^fb\.\d\.\d{10,}\.[\w-]+$/
/** Limpia lo que manda el navegador: solo cookies _fbp/_fbc con formato válido; recorta a lo que cabe en metadata. */
export function sanitizeBrowserContext(raw: { fbp?: unknown; fbc?: unknown; ip?: unknown; ua?: unknown }): Record<string, string> {
  const out: Record<string, string> = {}
  const s = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
  const fbp = s(raw.fbp, 200), fbc = s(raw.fbc, 400), ip = s(raw.ip, 64), ua = s(raw.ua, 450)
  if (META_COOKIE.test(fbp)) out.meta_fbp = fbp
  if (META_COOKIE.test(fbc)) out.meta_fbc = fbc
  if (ip) out.meta_ip = ip
  if (ua) out.meta_ua = ua
  return out
}

export interface MetaServerEvent {
  eventName: string
  eventId: string
  eventTime?: number
  sourceUrl?: string
  email?: string | null
  externalId?: string | null
  browser?: MetaBrowserContext
  customData?: Record<string, unknown>
}

export function buildMetaEventPayload(e: MetaServerEvent, testEventCode?: string): any {
  const b = e.browser || {}
  const user_data: Record<string, unknown> = {}
  if (e.email) user_data.em = [sha256(e.email)]
  if (e.externalId) user_data.external_id = [sha256(e.externalId)]
  if (b.fbp) user_data.fbp = b.fbp
  if (b.fbc) user_data.fbc = b.fbc
  if (b.ip) user_data.client_ip_address = b.ip
  if (b.ua) user_data.client_user_agent = b.ua
  return {
    data: [{
      event_name: e.eventName,
      event_time: e.eventTime ?? Math.floor(Date.now() / 1000),
      event_id: e.eventId,
      // "website" exige user agent; sin él (p. ej. checkout anterior a esta integración) es un cobro automático.
      action_source: b.ua ? 'website' : 'system_generated',
      ...(e.sourceUrl ? { event_source_url: e.sourceUrl } : {}),
      user_data,
      ...(e.customData ? { custom_data: e.customData } : {}),
    }],
    ...(testEventCode ? { test_event_code: testEventCode } : {}),
  }
}

/** Envía un evento. true si Meta lo aceptó; false si está deshabilitado o Meta lo rechazó (no lanza). */
export async function sendMetaEvent(e: MetaServerEvent): Promise<boolean> {
  const token = getSecret('META_CAPI_ACCESS_TOKEN')
  if (!token) return false
  const payload = buildMetaEventPayload(e, getSecret('META_TEST_EVENT_CODE') || undefined)
  try {
    const res = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/${metaPixelId()}/events?access_token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const text = await res.text()
    if (!res.ok) {
      console.warn(`[MetaCAPI] ${e.eventName} ${e.eventId} rechazado ${res.status}: ${text.slice(0, 300)}`)
      return false
    }
    console.log(`[MetaCAPI] ${e.eventName} ${e.eventId} enviado: ${text.slice(0, 200)}`)
    return true
  } catch (err: any) {
    console.warn(`[MetaCAPI] ${e.eventName} ${e.eventId} error de red: ${err?.message || err}`)
    return false
  }
}

/** LTV estimado igual que en el navegador: 6 meses para planes mensuales, el año completo para anuales. */
export function predictedLtv(amount: number, interval: string | null | undefined): number {
  return interval === 'year' ? amount : Math.round(amount * 6 * 100) / 100
}
