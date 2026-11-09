// Con la herramienta web_search, Claude a veces marca sus fuentes dentro del texto con
// <cite index="...">...</cite>. Esas marcas no son parte del contenido: se quitan dejando el texto.
const CITE_TAG = /<\/?cite\b[^>]*>/gi

export function stripCitationTags<T>(value: T): T {
  if (typeof value === 'string') {
    if (!/<\/?cite\b/i.test(value)) return value
    return value.replace(CITE_TAG, '').replace(/[ \t]{2,}/g, ' ').trim() as unknown as T
  }
  if (Array.isArray(value)) return value.map(v => stripCitationTags(v)) as unknown as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = stripCitationTags(v)
    return out as T
  }
  return value
}
