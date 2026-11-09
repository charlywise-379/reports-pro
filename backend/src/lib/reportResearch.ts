// Investigación verificable del reporte (docs/roadmap/reglas-busqueda-certera.md, secciones B, C y E.1).
//
// - reportWindow: una sola ventana de fechas anclada a T0 (la hora de generación en Ciudad de México).
// - buildSearchPlan: plan de consultas fijo generado por código (mismo cliente → mismas consultas).
// - buildResearchLog: registro de lo que la IA realmente buscó y leyó (consultas, URLs, page_age, errores, citas),
//   construido desde el contenido final de la respuesta.
// - checkCoverage: qué consultas del plan se ejecutaron.
// - verifyEvidence: nivel de evidencia CALCULADO para un elemento a partir de su campo `evidence` y el registro.
import { inferBusinessType, registeredDirectCompetitors } from './reportPrompts/promptContext'

const DAY = 864e5
const TZ = 'America/Mexico_City'

// ─── Ventana de fechas ──────────────────────────────────────────────────────────────
export interface ReportWindow {
  t0: string          // ISO de generación
  today: string       // AAAA-MM-DD en Ciudad de México
  reportStart: string // T0 − 7 días: "Esta semana" (movimiento 3, cambio CRÍTICO)
  e3Start: string     // T0 − 30 días: E3
  e2Start: string     // T0 − 90 días: E2
  monthLabel: string  // "noviembre 2026"
  year: number
}

const ymd = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: TZ }) // AAAA-MM-DD

export function reportWindow(now: Date = new Date()): ReportWindow {
  return {
    t0: now.toISOString(),
    today: ymd(now),
    reportStart: ymd(new Date(now.getTime() - 7 * DAY)),
    e3Start: ymd(new Date(now.getTime() - 30 * DAY)),
    e2Start: ymd(new Date(now.getTime() - 90 * DAY)),
    monthLabel: now.toLocaleDateString('es-MX', { month: 'long', year: 'numeric', timeZone: TZ }),
    year: Number(ymd(now).slice(0, 4)),
  }
}

/** Antigüedad en días de una fecha AAAA-MM-DD (o ISO) respecto a T0; negativa si es futura; null si no es legible. */
export function ageInDays(date: unknown, window: ReportWindow): number | null {
  if (typeof date !== 'string' || !date.trim()) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date.trim())
  if (!m) return null
  const d = Date.UTC(+m[1], +m[2] - 1, +m[3])
  const t = Date.UTC(+window.today.slice(0, 4), +window.today.slice(5, 7) - 1, +window.today.slice(8, 10))
  return Number.isFinite(d) ? Math.round((t - d) / DAY) : null
}

// ─── Plan de consultas ──────────────────────────────────────────────────────────────
export interface PlannedQuery {
  id: string
  block: 'competidor' | 'sector' | 'cliente' | 'secundarios'
  query: string
  /** Para reconocerla en el registro: nombre normalizado (o null) + palabras clave, basta una. */
  match: { name: string | null; keywords: string[] }
}
export interface SearchPlan {
  version: 1
  queries: PlannedQuery[]
  fetchUrls: Array<{ competitor: string; url: string }>
}

export const fold = (s: unknown) => (typeof s === 'string' ? s : '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const slug = (s: string) => fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30)
const shortGiro = (s: string) => s.split(/[\s,(/]+/).filter(Boolean).slice(0, 4).join(' ')

export function buildSearchPlan(project: any, window: ReportWindow): SearchPlan {
  const setup = project?.setup || {}
  const client = setup.companyName || project?.companyName || project?.name || ''
  const city = setup.city || 'México'
  const place = setup.city ? setup.city : 'México'
  const giro = shortGiro(inferBusinessType(setup))
  const industry = shortGiro(setup.industry || giro)
  const competitors = registeredDirectCompetitors(setup).slice(0, 5)
  const q: PlannedQuery[] = []
  for (const c of competitors) {
    const id = slug(c.name)
    q.push({ id: `c-${id}-1`, block: 'competidor', query: `"${c.name}" ${place}`, match: { name: c.name, keywords: [] } })
    q.push({ id: `c-${id}-2`, block: 'competidor', query: `"${c.name}" precios OR promoción OR descuento ${window.year}`, match: { name: c.name, keywords: ['precio', 'promoci', 'descuent', 'tarifa', 'oferta'] } })
    q.push({ id: `c-${id}-3`, block: 'competidor', query: `"${c.name}" nuevo OR lanzamiento OR vacantes OR alianza OR sucursal ${window.monthLabel}`, match: { name: c.name, keywords: ['nuevo', 'lanzamiento', 'vacante', 'alianza', 'sucursal', 'apertura', 'noticia'] } })
  }
  q.push({ id: 's-1', block: 'sector', query: `${giro} México noticias ${window.monthLabel}`, match: { name: null, keywords: ['noticia'] } })
  q.push({ id: 's-2', block: 'sector', query: `${giro} ${city} ${window.monthLabel}`, match: { name: null, keywords: [fold(city).split(' ')[0]] } })
  q.push({ id: 's-3', block: 'sector', query: `${industry} México regulación OR tendencia ${window.year}`, match: { name: null, keywords: ['regulaci', 'tendencia', 'norma'] } })
  if (client) q.push({ id: 'k-1', block: 'cliente', query: `"${client}"`, match: { name: client, keywords: [] } })
  q.push({ id: 'k-2', block: 'cliente', query: `${giro} ${city}`, match: { name: null, keywords: [fold(city).split(' ')[0]] } })
  q.push({ id: 'x-1', block: 'secundarios', query: `${giro} ${city} empresas`, match: { name: null, keywords: ['empresa', 'proveedor', 'mejores', 'directorio'] } })
  q.push({ id: 'x-2', block: 'secundarios', query: `${giro} México tienda en línea OR proveedores`, match: { name: null, keywords: ['tienda', 'linea', 'online', 'proveedor'] } })
  const fetchUrls = competitors.filter(c => typeof c.url === 'string' && /^https?:\/\//i.test(c.url)).map(c => ({ competitor: c.name, url: c.url as string }))
  return { version: 1, queries: q, fetchUrls }
}

// ─── Registro de investigación ──────────────────────────────────────────────────────
export interface ResearchQuery { id: string; query: string; results: Array<{ url: string; title: string; page_age: string | null }>; error: string | null }
export interface ResearchFetch { id: string; url: string; retrieved_at: string | null; ok: boolean; error: string | null }
export interface ResearchCall {
  phase: string
  model: string
  input: number       // tokens a precio completo
  cacheRead: number
  cacheWrite: number
  output: number
  webSearch: number
  webFetch: number
}
export interface ResearchLog {
  queries: ResearchQuery[]
  fetches: ResearchFetch[]
  citations: Array<{ url: string; cited_text: string }>
  usage: { web_search_requests: number; web_fetch_requests: number; input_tokens: number; output_tokens: number }
  calls: ResearchCall[]
}

export function emptyResearchLog(): ResearchLog {
  return { queries: [], fetches: [], citations: [], usage: { web_search_requests: 0, web_fetch_requests: 0, input_tokens: 0, output_tokens: 0 }, calls: [] }
}

// Precios por millón de tokens (USD, Claude API, noviembre 2026). Escritura de caché de 5 min = 1.25 × entrada.
// Haiku 5.5 tiene dos tarifas según el largo del prompt (≤ 100K / > 100K); el uso agregado de una solicitud con
// herramientas de servidor no dice el largo de cada vuelta, así que se usa la tarifa alta: cota superior.
const PRICES: Record<string, { input: number; output: number; cacheRead: number; inputLong?: number; outputLong?: number }> = {
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2 },
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.2 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5, cacheRead: 0.01, inputLong: 0.5, outputLong: 2.5 },
}
const WEB_SEARCH_USD = 0.01

/** Costo estimado en USD de las llamadas registradas (tokens + búsquedas; las lecturas no tienen cargo extra). */
export function estimateCostUsd(calls: ResearchCall[]): { total: number; byPhase: Record<string, number> } {
  const byPhase: Record<string, number> = {}
  for (const c of calls) {
    const p = PRICES[c.model]
    if (!p) continue
    const long = p.inputLong !== undefined && c.input + c.cacheRead + c.cacheWrite > 100_000
    const inRate = long ? p.inputLong! : p.input
    const outRate = long ? p.outputLong! : p.output
    const readRate = long ? p.inputLong! * 0.1 : p.cacheRead
    const usd = (c.input * inRate + c.cacheWrite * inRate * 1.25 + c.cacheRead * readRate + c.output * outRate) / 1e6 + c.webSearch * WEB_SEARCH_USD
    byPhase[c.phase] = (byPhase[c.phase] || 0) + usd
  }
  const total = Object.values(byPhase).reduce((s, v) => s + v, 0)
  for (const k of Object.keys(byPhase)) byPhase[k] = Math.round(byPhase[k] * 1000) / 1000
  return { total: Math.round(total * 1000) / 1000, byPhase }
}

/** Agrega al registro los bloques de una respuesta (se llama por cada respuesta: pausas y continuaciones incluidas). */
export function appendToResearchLog(log: ResearchLog, content: any[], usage?: any, meta?: { phase: string; model: string }): ResearchLog {
  const inputs = new Map<string, { name: string; input: any }>()
  for (const b of content || []) {
    if (b?.type === 'server_tool_use') inputs.set(b.id, { name: b.name, input: b.input || {} })
  }
  for (const b of content || []) {
    if (b?.type === 'web_search_tool_result') {
      const src = inputs.get(b.tool_use_id)
      const ok = Array.isArray(b.content)
      log.queries.push({
        id: b.tool_use_id,
        query: String(src?.input?.query ?? ''),
        results: ok ? b.content.filter((r: any) => r?.type === 'web_search_result').map((r: any) => ({ url: r.url, title: r.title, page_age: r.page_age ?? null })) : [],
        error: ok ? null : String(b.content?.error_code || 'error'),
      })
    } else if (b?.type === 'web_fetch_tool_result') {
      const src = inputs.get(b.tool_use_id)
      const ok = b.content?.type === 'web_fetch_result'
      log.fetches.push({
        id: b.tool_use_id,
        url: ok ? b.content.url : String(src?.input?.url ?? ''),
        retrieved_at: ok ? (b.content.retrieved_at ?? null) : null,
        ok,
        error: ok ? null : String(b.content?.error_code || 'error'),
      })
    } else if (b?.type === 'text' && Array.isArray(b.citations)) {
      for (const c of b.citations) if (c?.url) log.citations.push({ url: c.url, cited_text: String(c.cited_text || '') })
    }
  }
  const stu = usage?.server_tool_use || {}
  log.usage.web_search_requests += Number(stu.web_search_requests || 0)
  log.usage.web_fetch_requests += Number(stu.web_fetch_requests || 0)
  log.usage.input_tokens += Number(usage?.input_tokens || 0) + Number(usage?.cache_read_input_tokens || 0) + Number(usage?.cache_creation_input_tokens || 0)
  log.usage.output_tokens += Number(usage?.output_tokens || 0)
  if (meta && usage) {
    log.calls.push({
      phase: meta.phase, model: meta.model,
      input: Number(usage.input_tokens || 0), cacheRead: Number(usage.cache_read_input_tokens || 0),
      cacheWrite: Number(usage.cache_creation_input_tokens || 0), output: Number(usage.output_tokens || 0),
      webSearch: Number(stu.web_search_requests || 0), webFetch: Number(stu.web_fetch_requests || 0),
    })
  }
  return log
}

// ─── Expediente para la fase de síntesis ────────────────────────────────────────────
/**
 * Lo que el modelo de síntesis puede usar: el registro real de búsquedas y lecturas (armado por código, no por la
 * IA) + los hallazgos y la presencia del cliente que extrajo el modelo de investigación. Las URLs de los hallazgos
 * que no aparecen en el registro se marcan para que no se usen como evidencia.
 */
export function buildDossier(log: ResearchLog, research: any): string {
  const known = buildUrlIndex(log)
  const lines: string[] = []
  lines.push('A) REGISTRO DE BÚSQUEDAS (consulta → resultados: URL · título · antigüedad)')
  for (const q of log.queries) {
    lines.push(`• "${q.query}"${q.error ? ` — ERROR ${q.error}` : q.results.length ? '' : ' — sin resultados'}`)
    for (const r of q.results.slice(0, 10)) lines.push(`    - ${r.url} · ${r.title}${r.page_age ? ` · ${r.page_age}` : ''}`)
  }
  lines.push('', 'B) PÁGINAS LEÍDAS (web_fetch)')
  for (const f of log.fetches) lines.push(`• ${f.url} · ${f.ok ? `leída ${f.retrieved_at || ''}` : `no se pudo leer (${f.error})`}`)
  if (log.citations.length) {
    lines.push('', 'C) CITAS TEXTUALES DE LAS PÁGINAS')
    const seen = new Set<string>()
    for (const c of log.citations) {
      const k = `${c.url}|${c.cited_text}`
      if (seen.has(k)) continue
      seen.add(k)
      lines.push(`• ${c.url} — "${c.cited_text}"`)
    }
  }
  const findings = Array.isArray(research?.findings) ? research.findings : []
  lines.push('', 'D) HALLAZGOS (competidor · tipo · fecha · hecho · URL · cita)')
  for (const f of findings) {
    const ok = known.has(normalizeUrl(f?.url)) || Array.from(known.keys()).some(k => k.split('?')[0] === normalizeUrl(f?.url).split('?')[0])
    lines.push(`• ${f?.competitor ?? 'sector'} · ${f?.kind ?? '-'} · ${f?.date ?? 'sin fecha'} · ${f?.fact ?? ''}\n    URL: ${f?.url ?? '-'}${ok ? '' : '  [URL NO REGISTRADA EN ESTA INVESTIGACIÓN: no usar como evidencia]'} · vía ${f?.via ?? '-'}\n    Cita: "${f?.quote ?? ''}"`)
  }
  if (!findings.length && typeof research?.raw === 'string') lines.push(research.raw.slice(0, 20000))
  const presence = Array.isArray(research?.clientPresence) ? research.clientPresence : []
  if (presence.length) {
    lines.push('', 'E) PRESENCIA DEL CLIENTE POR CONSULTA')
    for (const p of presence) lines.push(`• "${p?.query}" → ${p?.appears ? `aparece (${p?.url || 's/URL'})` : 'NO aparece'}`)
  }
  if (research?.notes) lines.push('', `F) NOTAS DE LA INVESTIGACIÓN: ${research.notes}`)
  return lines.join('\n')
}

// ─── Cobertura ──────────────────────────────────────────────────────────────────────
export interface Coverage { planned: number; executed: number; missing: PlannedQuery[]; ratio: number }

export function checkCoverage(plan: SearchPlan, log: ResearchLog): Coverage {
  const done = log.queries.filter(q => !q.error).map(q => fold(q.query))
  const nameHit = (text: string, name: string) => {
    const keys = fold(name).split(/[^a-z0-9]+/).filter(t => t.length >= 3 && !['transportes', 'grupo', 'servicios', 'the', 'com'].includes(t))
    return keys.length ? keys.some(k => text.includes(k)) : text.includes(fold(name))
  }
  const used = new Set<number>()
  const matched = new Set<PlannedQuery>()
  const fuzzy = (t: string, p: PlannedQuery) =>
    (!p.match.name || nameHit(t, p.match.name)) &&
    (p.match.keywords.length === 0 || p.match.keywords.some(k => t.includes(fold(k)))) &&
    (p.match.name || p.block !== 'competidor')
  // 1) coincidencias exactas; 2) aproximadas, primero las consultas más específicas (con palabras clave).
  for (const p of plan.queries) {
    const i = done.findIndex((t, j) => !used.has(j) && t === fold(p.query))
    if (i >= 0) { used.add(i); matched.add(p) }
  }
  const pending = plan.queries.filter(p => !matched.has(p))
    .sort((a, b) => b.match.keywords.length - a.match.keywords.length)
  for (const p of pending) {
    const i = done.findIndex((t, j) => !used.has(j) && fuzzy(t, p))
    if (i >= 0) { used.add(i); matched.add(p) }
  }
  const missing = plan.queries.filter(p => !matched.has(p))
  const executed = plan.queries.length - missing.length
  return { planned: plan.queries.length, executed, missing, ratio: plan.queries.length ? executed / plan.queries.length : 1 }
}

// ─── Evidencia verificable ──────────────────────────────────────────────────────────
/** URL normalizada: minúsculas, sin esquema, sin www, sin utm_*, sin #, sin "/" final. */
export function normalizeUrl(u: unknown): string {
  if (typeof u !== 'string' || !u.trim()) return ''
  try {
    const url = new URL(u.trim().startsWith('http') ? u.trim() : `https://${u.trim()}`)
    for (const k of Array.from(url.searchParams.keys())) if (/^utm_|^fbclid$|^gclid$/i.test(k)) url.searchParams.delete(k)
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    const path = url.pathname.replace(/\/+$/, '')
    const qs = url.searchParams.toString()
    return `${host}${path}${qs ? `?${qs}` : ''}`.toLowerCase()
  } catch { return '' }
}
const hostPath = (n: string) => n.split('?')[0]

export interface UrlIndexEntry { via: 'search' | 'fetch'; page_age: string | null; cited: string[] }
export function buildUrlIndex(log: ResearchLog): Map<string, UrlIndexEntry> {
  const idx = new Map<string, UrlIndexEntry>()
  const add = (u: string, via: 'search' | 'fetch', page_age: string | null) => {
    const n = normalizeUrl(u)
    if (!n) return
    const prev = idx.get(n)
    if (!prev) idx.set(n, { via, page_age, cited: [] })
    else if (via === 'fetch') prev.via = 'fetch'
  }
  for (const q of log.queries) for (const r of q.results) add(r.url, 'search', r.page_age)
  for (const f of log.fetches) if (f.ok) add(f.url, 'fetch', null)
  for (const c of log.citations) { const e = idx.get(normalizeUrl(c.url)); if (e) e.cited.push(fold(c.cited_text)) }
  return idx
}

// Afirmaciones que web search no puede observar (C.3). Sin acentos y en minúsculas.
export const NOT_OBSERVABLE = new RegExp([
  'google ads', '\\banuncios?\\b', 'campana (activa|pagada)', 'inversion publicitaria', '\\bpauta\\b',
  'posicion(es)? ?#?[0-9]', '\\btop ?[0-9]', 'primeras posiciones', 'domina (las )?busquedas', '\\bserp\\b', '\\branking\\b',
  'seguidores', 'followers', 'engagement', 'interacciones', 'publico [0-9]+ veces', 'frecuencia (semanal|diaria)',
  '\\bposts?\\b', '\\breels?\\b', '\\bstories\\b', '\\blikes\\b',
  'resenas? (nuevas|en google|en maps)', 'google maps', 'calificacion [0-9]',
  'busquedas? (google )?ejecutadas?', 'busqueda manual', 'revision de (sitios|redes)', 'verificacion directa', 'analisis de posts',
].join('|'))
// Estados, no movimientos (C.4).
export const STATE_NOT_MOVE = /\b(mantiene|sigue|continua|domina|sin cambios|no se detect)/

export type EvidenceRule = 'sin-evidencia' | 'url-no-registrada' | 'no-observable' | 'sin-fecha' | 'fuera-de-ventana' | 'sectorial'
export interface EvidenceCheck { level: 0 | 1 | 2 | 3; ageDays: number | null; dateless: boolean; verified: boolean; rule: EvidenceRule | null }

/**
 * Nivel de evidencia CALCULADO (C.2): E3 = URL del registro de esta corrida + fecha legible ≤ 30 días + hecho
 * observable + cita; E2 = URL del registro con fecha 31-90 días, futura o sin fecha; E1 = solo sectorial;
 * E0 = sin URL registrada o afirmación no observable sin respaldo textual.
 */
export function verifyEvidence(evidence: any, texts: unknown[], index: Map<string, UrlIndexEntry>, window: ReportWindow): EvidenceCheck {
  const ev = evidence && typeof evidence === 'object' ? evidence : null
  const url = normalizeUrl(ev?.url)
  if (!ev || !url) return { level: 0, ageDays: null, dateless: true, verified: false, rule: 'sin-evidencia' }
  let entry = index.get(url)
  if (!entry) {
    // host + path ignorando la query string (no basta el dominio).
    for (const [k, v] of index) if (hostPath(k) === hostPath(url) && hostPath(url).includes('/')) { entry = v; break }
    // Una portada solo respalda un hecho si se leyó (fetch) exactamente esa portada.
    if (!entry && !hostPath(url).includes('/')) { const e = index.get(url); if (e?.via === 'fetch') entry = e }
  }
  if (!entry) return { level: 0, ageDays: null, dateless: true, verified: false, rule: 'url-no-registrada' }
  const quote = fold(ev.quote)
  const verified = !!quote && entry.cited.some(c => c.includes(quote.slice(0, 60)) || quote.includes(c.slice(0, 60)))
  const claim = fold(texts.filter(t => typeof t === 'string').join(' '))
  if (NOT_OBSERVABLE.test(claim) && !(quote && NOT_OBSERVABLE.test(quote))) {
    return { level: 0, ageDays: null, dateless: true, verified, rule: 'no-observable' }
  }
  if (fold(ev.observed) === 'sectorial') return { level: 1, ageDays: ageInDays(ev.date, window), dateless: !ev.date, verified, rule: 'sectorial' }
  let age = ageInDays(ev.date, window)
  if (age === null && entry.page_age) age = ageFromPageAge(entry.page_age, window)
  if (age === null) return { level: 2, ageDays: null, dateless: true, verified, rule: 'sin-fecha' }
  if (age < 0) return { level: 2, ageDays: age, dateless: false, verified, rule: null } // anunciado con fecha futura
  if (!quote) return { level: Math.min(2, age <= 90 ? 2 : 1) as 1 | 2, ageDays: age, dateless: false, verified, rule: 'sin-evidencia' }
  if (age <= 30) return { level: 3, ageDays: age, dateless: false, verified, rule: null }
  if (age <= 90) return { level: 2, ageDays: age, dateless: false, verified, rule: 'fuera-de-ventana' }
  return { level: 1, ageDays: age, dateless: false, verified, rule: 'fuera-de-ventana' }
}

/**
 * Ausencia del cliente ("no aparece en Google para X"): no hay URL que citar, pero se verifica en código.
 * E3 si la consulta citada (evidence.query) se ejecutó en esta corrida sin error y ningún resultado es del
 * dominio del cliente ni lleva su nombre en el título; E0 si no se ejecutó o el cliente sí aparece.
 */
export function verifyAbsence(evidence: any, log: ResearchLog, client: { name?: string; website?: string }): EvidenceCheck {
  const q = fold(evidence?.query).replace(/["“”]/g, '').trim()
  if (!q) return { level: 0, ageDays: null, dateless: true, verified: false, rule: 'sin-evidencia' }
  const run = log.queries.find(x => !x.error && fold(x.query).replace(/["“”]/g, '').trim() === q)
  if (!run) return { level: 0, ageDays: null, dateless: true, verified: false, rule: 'url-no-registrada' }
  const domain = normalizeUrl(client.website).split('/')[0]
  const name = fold(client.name).replace(/[^a-z0-9]+/g, ' ').trim()
  const present = run.results.some(r => (domain && normalizeUrl(r.url).startsWith(domain))
    || (name && fold(r.title).replace(/[^a-z0-9]+/g, ' ').includes(name)))
  return present
    ? { level: 0, ageDays: 0, dateless: false, verified: false, rule: 'no-observable' }
    : { level: 3, ageDays: 0, dateless: false, verified: true, rule: null }
}

/** page_age llega como texto libre ("2 days ago", "November 4, 2026", "2026-11-04"); solo se usa si es legible. */
function ageFromPageAge(pageAge: string, window: ReportWindow): number | null {
  const s = pageAge.trim().toLowerCase()
  const rel = /^(\d+)\s+(hour|day|week|month)s?\s+ago$/.exec(s)
  if (rel) return Math.floor(+rel[1] * ({ hour: 1 / 24, day: 1, week: 7, month: 30 } as any)[rel[2]])
  const iso = ageInDays(s, window)
  if (iso !== null) return iso
  const t = Date.parse(pageAge)
  if (!Number.isFinite(t)) return null
  return ageInDays(new Date(t).toISOString(), window)
}

/** Registro persistible (Report.evidenceJson) y resumen para metricsJson.search. */
export function researchSummary(plan: SearchPlan, log: ResearchLog, coverage: Coverage) {
  return {
    planVersion: plan.version,
    coverage: { planned: coverage.planned, executed: coverage.executed, missing: coverage.missing.map(m => m.query), ratio: Math.round(coverage.ratio * 100) / 100 },
    usage: log.usage,
    queries: log.queries.length,
    fetches: log.fetches.length,
    errors: log.queries.filter(q => q.error).length + log.fetches.filter(f => f.error).length,
  }
}
