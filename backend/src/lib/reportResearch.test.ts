import { describe, it, expect } from 'vitest'
import {
  reportWindow, ageInDays, buildSearchPlan, emptyResearchLog, appendToResearchLog, checkCoverage,
  normalizeUrl, buildUrlIndex, verifyEvidence, verifyAbsence,
} from './reportResearch'
import { buildCompetitivePromptV3 } from './reportPrompts/competitivePromptV3'
import { FIXTURE_PROJECT_REAL, FIXTURE_DATE_INFO } from './reportFixtures'
import { enforceRubrics } from './reportEnforcement'

// T0 fijo: 6 nov 2026, 13:00 en Ciudad de México.
const T0 = new Date('2026-11-06T19:00:00Z')
const W = reportWindow(T0)

const almex = {
  name: 'Almex', companyName: 'Almex',
  setup: {
    companyName: 'Almex', city: 'Monterrey', website: 'https://almex.com.mx', industry: 'Transporte de carga',
    additionalContext: JSON.stringify({ directCompetitors: [
      { name: 'Transportes Castores', url: 'https://www.castores.com.mx' },
      { name: 'Transportes Tresguerras', url: 'https://tresguerras.com.mx' },
    ] }),
  },
}

/** Respuesta simulada de la API con una búsqueda, su resultado, una lectura y una cita. */
const fakeContent = (query: string, results: Array<{ url: string; title?: string; page_age?: string | null }>, extra: any[] = []) => [
  { type: 'server_tool_use', id: `t-${query}`, name: 'web_search', input: { query } },
  { type: 'web_search_tool_result', tool_use_id: `t-${query}`, content: results.map(r => ({ type: 'web_search_result', url: r.url, title: r.title || '', page_age: r.page_age ?? null, encrypted_content: '' })) },
  ...extra,
]

describe('ventana única', () => {
  it('se ancla a T0 en Ciudad de México', () => {
    expect(W).toMatchObject({ today: '2026-11-06', reportStart: '2026-10-30', e3Start: '2026-10-07', e2Start: '2026-08-08', year: 2026 })
    expect(ageInDays('2026-11-04', W)).toBe(2)
    expect(ageInDays('2026-11-20', W)).toBe(-14)
    expect(ageInDays('hace poco', W)).toBeNull()
  })
})

describe('plan de búsquedas fijo', () => {
  it('3 consultas por competidor + sector + cliente + secundarios, determinista', () => {
    const plan = buildSearchPlan(almex, W)
    expect(plan.queries).toHaveLength(2 * 3 + 3 + 2 + 2)
    expect(plan.queries[0].query).toBe('"Transportes Castores" Monterrey')
    expect(plan.queries.map(q => q.query)).toContain('"Almex"')
    expect(plan.fetchUrls).toEqual([
      { competitor: 'Transportes Castores', url: 'https://www.castores.com.mx' },
      { competitor: 'Transportes Tresguerras', url: 'https://tresguerras.com.mx' },
    ])
    expect(buildSearchPlan(almex, W)).toEqual(plan)
  })

  it('el prompt v3 lleva el plan, la ventana y el campo evidence, y conserva el esquema de v2', () => {
    const plan = buildSearchPlan(FIXTURE_PROJECT_REAL, W)
    const p = buildCompetitivePromptV3(FIXTURE_PROJECT_REAL, FIXTURE_DATE_INFO, { window: W, plan })
    expect(p).toContain('PLAN DE INVESTIGACIÓN OBLIGATORIO')
    for (const q of plan.queries) expect(p).toContain(q.query)
    expect(p).toContain('Esta semana: 2026-10-30 a 2026-11-06')
    expect(p).toContain('PERIODO DEL REPORTE: 2026-10-30 al 2026-11-06') // nunca el periodo de la fixture
    expect(p).not.toContain('mínimo 10 búsquedas')
    expect(p.match(/"evidence": \{/g)!.length).toBeGreaterThanOrEqual(7)
    expect(p).toContain('"followersEstimate": "No detectado"')
  })
})

describe('registro y cobertura', () => {
  it('registra consultas, URLs, errores, lecturas y uso', () => {
    const log = emptyResearchLog()
    appendToResearchLog(log, [
      ...fakeContent('"Transportes Castores" Monterrey', [{ url: 'https://www.castores.com.mx/promociones', page_age: '2 days ago' }]),
      { type: 'server_tool_use', id: 'e1', name: 'web_search', input: { query: 'x' } },
      { type: 'web_search_tool_result', tool_use_id: 'e1', content: { type: 'web_search_tool_result_error', error_code: 'too_many_requests' } },
      { type: 'server_tool_use', id: 'f1', name: 'web_fetch', input: { url: 'https://tresguerras.com.mx' } },
      { type: 'web_fetch_tool_result', tool_use_id: 'f1', content: { type: 'web_fetch_result', url: 'https://tresguerras.com.mx', retrieved_at: '2026-11-06T18:00:00Z', content: {} } },
      { type: 'text', text: 'x', citations: [{ type: 'web_search_result_location', url: 'https://www.castores.com.mx/promociones', cited_text: '15% de descuento en LTL', title: '', encrypted_index: '' }] },
    ], { output_tokens: 10, input_tokens: 5, server_tool_use: { web_search_requests: 2, web_fetch_requests: 1 } })
    expect(log.queries.map(q => q.error)).toEqual([null, 'too_many_requests'])
    expect(log.fetches[0]).toMatchObject({ url: 'https://tresguerras.com.mx', ok: true })
    expect(log.citations).toHaveLength(1)
    expect(log.usage).toMatchObject({ web_search_requests: 2, web_fetch_requests: 1 })
  })

  it('reconoce las consultas del plan aunque varíen en redacción y lista las faltantes', () => {
    const plan = buildSearchPlan(almex, W)
    const log = emptyResearchLog()
    for (const q of plan.queries.slice(1)) appendToResearchLog(log, fakeContent(q.query, []))
    appendToResearchLog(log, fakeContent('Castores transporte Monterrey noticias', []))
    const cov = checkCoverage(plan, log)
    expect(cov.executed).toBe(plan.queries.length)
    const partial = emptyResearchLog()
    appendToResearchLog(partial, fakeContent(plan.queries[0].query, []))
    expect(checkCoverage(plan, partial).missing).toHaveLength(plan.queries.length - 1)
  })
})

describe('evidencia verificable', () => {
  const log = emptyResearchLog()
  appendToResearchLog(log, [
    ...fakeContent('"Transportes Castores" precios', [
      { url: 'https://www.castores.com.mx/promociones?utm_source=x', page_age: null },
      { url: 'https://www.castores.com.mx/blog/sin-fecha' },
    ]),
    ...fakeContent('"Almex"', [{ url: 'https://directorio.mx/transportistas', title: 'Transportistas en Monterrey' }]),
  ])
  const idx = buildUrlIndex(log)

  it('normaliza URLs (www, utm, / final)', () => {
    expect(normalizeUrl('https://www.Castores.com.mx/Promociones/?utm_source=x#a')).toBe('castores.com.mx/promociones')
  })

  it('E3 con URL de esta corrida, fecha ≤ 30 días y cita; E2 sin fecha; E0 con URL inventada', () => {
    const ev = { url: 'https://castores.com.mx/promociones', date: '2026-11-04', quote: '15% de descuento en LTL', observed: 'promocion' }
    expect(verifyEvidence(ev, ['Castores lanza 15% de descuento'], idx, W)).toMatchObject({ level: 3, ageDays: 2 })
    expect(verifyEvidence({ ...ev, url: 'https://www.castores.com.mx/blog/sin-fecha', date: null }, ['x'], idx, W)).toMatchObject({ level: 2, dateless: true })
    expect(verifyEvidence({ ...ev, url: 'https://castores.com.mx/otra-pagina' }, ['x'], idx, W)).toMatchObject({ level: 0, rule: 'url-no-registrada' })
    expect(verifyEvidence({ ...ev, url: 'https://castores.com.mx' }, ['x'], idx, W)).toMatchObject({ level: 0 }) // portada sin fetch
    expect(verifyEvidence({ ...ev, date: '2026-09-01' }, ['x'], idx, W)).toMatchObject({ level: 2, rule: 'fuera-de-ventana' })
    expect(verifyEvidence(null, ['x'], idx, W)).toMatchObject({ level: 0, rule: 'sin-evidencia' })
  })

  it('afirmaciones no observables (Google Ads, posiciones, seguidores) valen E0 aunque la URL exista', () => {
    const ev = { url: 'https://castores.com.mx/promociones', date: '2026-11-04', quote: 'envío gratis', observed: 'promocion' }
    expect(verifyEvidence(ev, ['Campaña activa en Google Ads en posiciones 1-2'], idx, W)).toMatchObject({ level: 0, rule: 'no-observable' })
    expect(verifyEvidence(ev, ['Creatify suma 150 interacciones por post'], idx, W).level).toBe(0)
  })

  it('ausencia del cliente: E3 si la consulta se ejecutó y el cliente no aparece', () => {
    expect(verifyAbsence({ observed: 'ausencia', query: '"Almex"' }, log, { name: 'Almex', website: 'https://almex.com.mx' }).level).toBe(3)
    expect(verifyAbsence({ observed: 'ausencia', query: 'transporte Monterrey' }, log, { name: 'Almex' }).level).toBe(0) // no se ejecutó
    const withClient = emptyResearchLog()
    appendToResearchLog(withClient, fakeContent('"Almex"', [{ url: 'https://www.almex.com.mx/', title: 'Almex' }]))
    expect(verifyAbsence({ query: '"Almex"' }, withClient, { name: 'Almex', website: 'almex.com.mx' }).level).toBe(0)
  })

  it('enforceRubrics con registro: degrada el movimiento inventado y excluye estados y cambios sin URL', () => {
    const { aiData, audit } = enforceRubrics({
      competitors: [
        { name: 'Sticker Mule', threatFactors: { overlap: 3, move: 3, strength: 2, digital: 1 }, threatBasis: 'E3 · campaña en Google Ads',
          recentMove: 'Campaña activa en Google Ads México', evidence: { url: 'https://castores.com.mx/promociones', date: '2026-11-04', quote: 'x', observed: 'promocion' } },
        { name: 'Castores', threatFactors: { overlap: 3, move: 3, strength: 2, digital: 1 }, threatBasis: 'E3 · promoción',
          recentMove: '15% de descuento LTL', evidence: { url: 'https://castores.com.mx/promociones', date: '2026-11-04', quote: '15% de descuento', observed: 'promocion' } },
        { name: 'Tresguerras', threatFactors: { overlap: 3, move: 2, strength: 2, digital: 1 }, threatBasis: 'E2 · x', recentMove: 'Mantiene publicación semanal' },
      ],
      changesCol1: [
        { title: 'Castores baja 15% LTL', category: 'PRECIO · CRÍTICO', levelBasis: 'E3 · x', evidence: { url: 'https://castores.com.mx/promociones', date: '2026-11-04', quote: '15%', observed: 'promocion' } },
        { title: 'Estafeta abre sucursal', category: 'EXPANSIÓN · ALTO', levelBasis: 'E3 · x', evidence: { url: 'https://estafeta.com/nota', date: '2026-11-03', quote: 'x', observed: 'nota_prensa' } },
        { title: 'Tresguerras mantiene precios', category: 'PRECIO · MEDIO', levelBasis: 'E2 · x' },
      ],
      priceTrends: [{ name: 'Tresguerras', change: '↑ subió 5% · fuente' }],
    }, [], { companyName: 'Almex', research: { log, window: W, client: { name: 'Almex' } } })
    expect(aiData.competitors.map((c: any) => c.threat)).toEqual([7, 10, 7]) // Google Ads → move 0 · real → 3 · estado → 0
    expect(aiData.changesCol1.map((c: any) => c.title)).toEqual(['Castores baja 15% LTL'])
    expect(aiData.priceTrends[0].change).toBe('→ Sin cambios verificables')
    expect(audit.evidenceChecks.scored).toBeGreaterThan(0)
    expect(audit.evidenceQuality).not.toBeNull()
  })

  it('E3 de hace 20 días: movimiento 2 y cambio ALTO (no "esta semana")', () => {
    const l = emptyResearchLog()
    appendToResearchLog(l, fakeContent('q', [{ url: 'https://x.mx/nota' }]))
    const ev = { url: 'https://x.mx/nota', date: '2026-10-17', quote: 'abre sucursal', observed: 'nota_prensa' }
    const { aiData } = enforceRubrics({
      competitors: [{ name: 'X', threatFactors: { overlap: 3, move: 3, strength: 2, digital: 1 }, threatBasis: 'E3 · x', recentMove: 'abre sucursal', evidence: ev }],
      changesCol1: [{ title: 'X abre sucursal', category: 'EXPANSIÓN · CRÍTICO', levelBasis: 'E3 · x', evidence: ev }],
    }, [], { research: { log: l, window: W, client: {} } })
    expect(aiData.competitors[0].threat).toBe(9)
    expect(aiData.changesCol1[0].category).toBe('EXPANSIÓN · ALTO')
  })
})

import { buildDossier, estimateCostUsd } from './reportResearch'
import { buildResearchPrompt } from './reportPrompts/researchPrompt'

describe('dos fases: investigación y síntesis', () => {
  it('el prompt de investigación lleva el plan completo y el formato de hallazgos', () => {
    const plan = buildSearchPlan(almex, W)
    const p = buildResearchPrompt(almex, { window: W, plan })
    for (const q of plan.queries) expect(p).toContain(q.query)
    expect(p).toContain('"findings"')
    expect(p).toContain('https://www.castores.com.mx')
  })

  it('el expediente lleva el registro real y marca las URLs de hallazgos que no salieron de la investigación', () => {
    const log = emptyResearchLog()
    appendToResearchLog(log, fakeContent('"Transportes Castores" precios', [{ url: 'https://www.castores.com.mx/promociones', title: 'Promociones', page_age: '2 days ago' }]))
    const d = buildDossier(log, {
      findings: [
        { competitor: 'Transportes Castores', kind: 'promocion', fact: '15% LTL', date: '2026-11-04', url: 'https://castores.com.mx/promociones', quote: '15%', via: 'search' },
        { competitor: 'Estafeta', kind: 'nota_prensa', fact: 'x', date: null, url: 'https://inventada.mx/nota', quote: 'x', via: 'search' },
      ],
      clientPresence: [{ query: '"Almex"', appears: false, url: null }],
    })
    expect(d).toContain('"Transportes Castores" precios')
    expect(d).toContain('https://www.castores.com.mx/promociones · Promociones · 2 days ago')
    expect(d).toMatch(/inventada\.mx\/nota {2}\[URL NO REGISTRADA/)
    expect(d).not.toMatch(/castores\.com\.mx\/promociones {2}\[URL NO REGISTRADA/)
    expect(d).toMatch(/Almex.{0,4} → NO aparece/)
  })

  it('el prompt v3 en modo síntesis no pide buscar y trae el expediente', () => {
    const plan = buildSearchPlan(FIXTURE_PROJECT_REAL, W)
    const p = buildCompetitivePromptV3(FIXTURE_PROJECT_REAL, FIXTURE_DATE_INFO, { window: W, plan, dossier: 'EXPEDIENTE-DE-PRUEBA' })
    expect(p).toContain('No tienes herramientas de búsqueda')
    expect(p).toContain('EXPEDIENTE-DE-PRUEBA')
    expect(p).not.toContain('PLAN DE INVESTIGACIÓN OBLIGATORIO')
    expect(p).toContain('"evidence": {')
  })

  it('costo estimado por fase con caché (Haiku tarifa alta > 100K, Sonnet)', () => {
    const c = estimateCostUsd([
      { phase: 'investigacion', model: 'claude-haiku-5-5', input: 1000, cacheRead: 900_000, cacheWrite: 150_000, output: 10_000, webSearch: 22, webFetch: 5 },
      { phase: 'sintesis', model: 'claude-sonnet-5-5', input: 60_000, cacheRead: 0, cacheWrite: 20_000, output: 45_000, webSearch: 0, webFetch: 0 },
    ])
    // Haiku: (1000·0.5 + 150000·0.625 + 900000·0.05 + 10000·2.5)/1e6 + 0.22 = 0.38375 · Sonnet: (60000·2 + 20000·2.5 + 45000·10)/1e6 = 0.62
    expect(c.byPhase).toEqual({ investigacion: 0.384, sintesis: 0.62 })
    expect(c.total).toBeCloseTo(1.004, 2)
  })
})
