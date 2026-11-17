// Meta Pixel: helper para eventos estándar. El script base se carga en app/MetaPixel.tsx (layout raíz).
// - Si el píxel no cargó (bloqueador de anuncios, sin ID), no hace nada y no rompe la página.
// - `once` evita duplicados entre recargas (p. ej. la página de éxito del checkout) usando localStorage.
// - `eventID` permite deduplicar con la Conversions API si se agrega después en el servidor.

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '1886959832294707'

type FbqParams = Record<string, string | number | boolean | undefined>
declare global {
  interface Window { fbq?: (...args: unknown[]) => void }
}

function alreadySent(key: string): boolean {
  try { return localStorage.getItem(`meta_evt:${key}`) === '1' } catch { return false }
}
function markSent(key: string): void {
  try { localStorage.setItem(`meta_evt:${key}`, '1') } catch { /* modo privado: se ignora */ }
}

export function trackMeta(event: string, params?: FbqParams, opts: { once?: string; eventID?: string } = {}): void {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function' || !META_PIXEL_ID) return
  if (opts.once && alreadySent(opts.once)) return
  try {
    if (opts.eventID) window.fbq('track', event, params || {}, { eventID: opts.eventID })
    else window.fbq('track', event, params || {})
    if (opts.once) markSent(opts.once)
  } catch { /* nunca romper la UI por medición */ }
}

/** Cookies _fbp/_fbc del píxel, para que el evento del servidor (Conversions API) coincida con este navegador. */
export function metaCookies(): { metaFbp?: string; metaFbc?: string } {
  if (typeof document === 'undefined') return {}
  const get = (n: string) => document.cookie.split('; ').find(c => c.startsWith(n + '='))?.split('=').slice(1).join('=')
  const fbp = get('_fbp'), fbc = get('_fbc')
  return { ...(fbp ? { metaFbp: fbp } : {}), ...(fbc ? { metaFbc: fbc } : {}) }
}

export function trackMetaPageView(): void {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return
  try { window.fbq('track', 'PageView') } catch { /* noop */ }
}
