import { getAnthropic } from './anthropic'
import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'
import { prisma } from './prisma'
import { Prisma } from '@prisma/client'
import { getSecret } from './config'
import { renderTemplate } from './reportRender'
import { resolveReportTemplate, renderReportHtmlV2 } from './reportTemplates'
import { loadReportLogos } from './reportLogos'
import { stripCitationTags } from './stripCitations'
import { computeCounts, computeScores, computeDeltas, SCORING_VERSION, PreviousMetrics, alertLevelOf } from './reportScoring'
import { enforceRubrics, auditSummary } from './reportEnforcement'
import { buildCompetitivePrompt, resolvePromptVersion, defaultResearchContext, type PromptVersion } from './reportPrompts'
import { emptyResearchLog, appendToResearchLog, checkCoverage, researchSummary, type ResearchLog, type ReportWindow, type SearchPlan, type Coverage } from './reportResearch'
import { inferBusinessType, registeredDirectCompetitors } from './reportPrompts/promptContext'

// ─── Tipos ───────────────────────────────────────────
interface ReportData {
  bodyClass: string
  companyName: string
  industry: string
  targetMarket: string
  tags: string[]
  weekNumber: number
  year: number
  edition: number
  periodStart: string
  periodEnd: string
  generatedAt: string
  nextMonth: string
  nextReportDate: string
  nextReportTime: string
  nextEdition: number
  deliveryChannel: string
  frequency: string
  activeAreas: number
  competitorsCount: number
  competitivePressure: number
  opportunityScore: number
  marketRisk: number
  riskLevel: string
  generalTrend: string
  trendDelta: string
  trendDeltaText: string
  signalsDeltaText: string
  signalsDeltaShort: string
  metrics: Record<string, unknown>
  pressureDash: number
  opportunityDash: number
  gaugePath: string
  needleX: number
  needleY: number
  signalsCount: number
  signalsDelta: string
  movementsCount: number
  criticalMovements: number
  minorMovements: number
  alertsCount: number
  activeCompetitors: number
  totalChanges: number
  clientScore?: null | {
    overall: number
    price: number
    digital: number
    differentiation: number
    speed: number
    vsCompetitors: string
    strongAreas: string[]
    weakAreas: string[]
    weeklyChange: string
    summary: string
  }
  insights: { color: string; borderColor: string; category: string; text: string }[]
  actions: { color: string; borderColor: string; priority: string; text: string }[]
  topCompetitors: any[]
  earlyWarning: string
  marketStatus: string
  marketStatusDesc: string
  gaugeMetrics: any[]
  sectorMetrics: any[]
  mainAlertTitle: string
  mainAlertDesc: string
  mainAlertLevel: string
  competitors: any[]
  mostAggressiveName: string
  mostAggressiveDesc: string
  weakestName: string
  weakestDesc: string
  emergingName: string
  emergingDesc: string
  criticalAlertsCount: number
  highAlertsCount: number
  mediumAlertsCount: number
  criticalAlerts: any[]
  mediumAlerts: any[]
  changesCol1: any[]
  changesCol2: any[]
  priceTrends: any[]
  priceTrendAlert: string
  dominantMessages: any[]
  targetSegments: any[]
  newChannels: any[]
  rivalAdvantages: any[]
  rivalLeaderName: string
  opportunitiesCount: number
  opportunities: any[]
  rivalWeaknesses: any[]
  highRisksCount: number
  mediumRisksCount: number
  highRisks: any[]
  mediumRisks: any[]
  benchmarkFactors: number
  benchmarkCompetitors: any[]
  benchmarkRowsHTML?: string
  secondaryCompetitors?: any[]
  radarPoints: string
  strengths: string[]
  improvements: string[]
  highPriorityRecs: any[]
  mediumPriorityRecs: any[]
  lowPriorityRecs: any[]
  weeklyPlans?: any[]
  criticalSignals: string[]
  importantSignals: string[]
  infoSignals: string[]
  weeklyPlansHTML?: string
}

// ─── Calcular gauge path y aguja ─────────────────────
function calcGauge(value: number) {
  const angle = -180 + (value / 100) * 180
  const rad = (angle * Math.PI) / 180
  const cx = 170, cy = 175, r = 130
  const endX = cx + r * Math.cos(rad)
  const endY = cy + r * Math.sin(rad)
  const needleX = Math.round(cx + 110 * Math.cos(rad))
  const needleY = Math.round(cy + 110 * Math.sin(rad))
  const pressureDash = Math.round((value / 100) * 289)
  return {
    gaugePath: `${Math.round(endX)} ${Math.round(endY)}`,
    needleX,
    needleY,
    pressureDash,
  }
}

// ─── Llamar a Claude con web search ──────────────────
// Modelo del reporte. claude-sonnet-4-5 se retira el 30 nov 2026 (docs/roadmap/reglas-busqueda-certera.md D.1).
export const REPORT_MODEL = process.env.REPORT_MODEL || 'claude-opus-5-5'
const MAX_PAUSE_CONTINUATIONS = 3
const MAX_COVERAGE_CONTINUATIONS = 1

export interface ReportResearch {
  promptVersion: PromptVersion
  window: ReportWindow
  plan: SearchPlan
  log: ResearchLog
  coverage: Coverage
}

/** JSON del reporte: el texto posterior al último resultado de herramienta, del primer "{" al último "}". */
function extractReportJson(content: any[]): any {
  let lastTool = -1
  content.forEach((b, i) => { if (b?.type === 'web_search_tool_result' || b?.type === 'web_fetch_tool_result' || b?.type === 'server_tool_use') lastTool = i })
  const text = content.slice(lastTool + 1).filter(b => b?.type === 'text').map(b => b.text).join('')
    .replace(/```json\s*/g, '').replace(/```\s*/g, '')
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('Claude no entregó un JSON en su respuesta final')
  return stripCitationTags(JSON.parse(text.slice(start, end + 1)))
}

async function streamOnce(params: any): Promise<any> {
  for (let attempt = 1; ; attempt++) {
    try {
      const stream = getAnthropic().messages.stream(params)
      return await stream.finalMessage()
    } catch (err: any) {
      const retryable = err?.status === 529 || err?.status === 429 || /overloaded/i.test(String(err?.message))
      if (!retryable || attempt >= 3) throw err
      const retryAfter = Number(err?.headers?.get?.('retry-after')) || 0
      const waitMs = Math.max(retryAfter * 1000, attempt * 15000)
      console.log(`⏳ Claude ocupado (${err?.status}) — reintento ${attempt}/3 en ${waitMs / 1000}s`)
      await new Promise(r => setTimeout(r, waitMs))
    }
  }
}

/**
 * Investigación con Claude + web search/fetch. Devuelve el JSON del reporte y el registro de lo que realmente
 * se buscó y leyó, que reportEnforcement usa para calcular el nivel de evidencia y que se guarda en el reporte.
 */
export async function researchWithClaude(project: any, dateInfo: any, now: Date = new Date()): Promise<{ aiData: any; research: ReportResearch }> {
  const promptVersion = resolvePromptVersion()
  const ctx = defaultResearchContext(project, now)
  const prompt = buildCompetitivePrompt(project, dateInfo, promptVersion, ctx)
  console.log(`🤖 Investigación con ${REPORT_MODEL} · prompt ${promptVersion} · plan de ${ctx.plan.queries.length} búsquedas`)
  const businessType = inferBusinessType(project.setup || {})
  const systemPrompt = `Eres el analista senior de inteligencia competitiva de Reports PRO, especializado en PYMES de México y LATAM.

IDENTIDAD DEL ANÁLISIS:
- Empresa cliente: ${businessType}
- PROHIBIDO analizar: telecomunicaciones (Telcel, AT&T, Movistar, Izzi, 5G), banca nacional, corporativos globales, empresas de tamaño incomparable al cliente
- SOLO analiza: competidores del mismo giro (${businessType}) y tamaño PYME
- Idioma: español de México — nunca inglés, nunca español neutro

PROCESO OBLIGATORIO — en orden:
1. INVESTIGA → ejecuta el plan de búsquedas completo del mensaje (y las lecturas indicadas)
2. VERIFICA → cada dato que puntúa termina en una página concreta de esta investigación, con fecha y cita
3. ANALIZA → identifica patrones, movimientos y gaps
4. SINTETIZA → determina las 3 cosas más importantes para el cliente esta semana
5. ESTRUCTURA → entrega el JSON de salida como último bloque de texto

REGLA DE ORO: Cada dato debe poder ser verificado por el cliente. Si no puedes verificarlo, márcalo explícitamente como "Estimado" o "Sin datos públicos disponibles". NUNCA inventes datos.`

  const setup = project.setup || {}
  const tools: any[] = [
    {
      type: 'web_search_20260209', name: 'web_search', max_uses: 28, allowed_callers: ['direct'],
      user_location: { type: 'approximate', city: setup.city || 'Ciudad de México', country: 'MX', timezone: 'America/Mexico_City' },
    },
    { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 10, allowed_callers: ['direct'], citations: { enabled: true }, max_content_tokens: 20000 },
  ]
  const messages: any[] = [{ role: 'user', content: prompt }]
  const log = emptyResearchLog()
  let pauses = 0, coverageRetries = 0, formatRetries = 0
  let aiData: any = null
  let coverage: Coverage = checkCoverage(ctx.plan, log)

  for (;;) {
    const final = await streamOnce({
      model: REPORT_MODEL, max_tokens: 64000, system: systemPrompt, tools,
      output_config: { effort: 'high' }, messages,
    })
    appendToResearchLog(log, final.content, final.usage)
    console.log(`✅ ${final.stop_reason} · búsquedas ${log.queries.length} · lecturas ${log.fetches.length} · tokens ${final.usage?.output_tokens}`)

    if (final.stop_reason === 'refusal') {
      throw new Error(`Claude rechazó la solicitud (${final.stop_details?.category ?? 'sin categoría'}): ${final.stop_details?.explanation ?? ''}`)
    }
    // Continuaciones: se reenvía el contenido del asistente tal cual (historial solo crece).
    messages.push({ role: 'assistant', content: final.content })
    if (final.stop_reason === 'pause_turn') {
      if (++pauses > MAX_PAUSE_CONTINUATIONS) throw new Error('La investigación excedió el límite de pausas')
      continue
    }
    try {
      aiData = extractReportJson(final.content)
    } catch (e) {
      if (++formatRetries > 1) throw new Error(`Claude devolvió JSON inválido: ${e}`)
      messages.push({ role: 'user', content: final.stop_reason === 'max_tokens'
        ? 'Tu respuesta se cortó. Entrega de nuevo SOLO el JSON completo del reporte, más compacto (descripciones de una o dos oraciones).'
        : 'No encontré un JSON válido en tu respuesta. Entrega SOLO el JSON completo del reporte, sin texto antes ni después.' })
      continue
    }
    coverage = checkCoverage(ctx.plan, log)
    if (promptVersion === 'v3' && coverage.missing.length && coverageRetries < MAX_COVERAGE_CONTINUATIONS) {
      coverageRetries++
      console.log(`🔎 Cobertura ${coverage.executed}/${coverage.planned}: se piden ${coverage.missing.length} consultas faltantes`)
      messages.push({ role: 'user', content: `Faltaron ${coverage.missing.length} consultas del plan de FASE 1:\n${coverage.missing.map(m => `- ${m.query}`).join('\n')}\nEjecútalas tal cual, incorpora lo que encuentres y entrega de nuevo el JSON completo actualizado, con el mismo formato.` })
      continue
    }
    break
  }
  console.log(`🔍 Cobertura del plan: ${coverage.executed}/${coverage.planned} · web_search ${log.usage.web_search_requests} · web_fetch ${log.usage.web_fetch_requests}`)
  return { aiData, research: { promptVersion, window: ctx.window, plan: ctx.plan, log, coverage } }
}

/** Compatibilidad: solo el JSON del reporte (scripts antiguos). */
export async function callClaudeWithSearch(project: any, dateInfo: any): Promise<any> {
  return (await researchWithClaude(project, dateInfo)).aiData
}

// ─── Colores por índice de competidor ────────────────
const COMPETITOR_COLORS = [
  { color: '#E24B4A', borderColor: '#F7C1C1', trackColor: 'rgba(226,75,74,0.15)', riskBg: '#E24B4A', riskColor: '#fff' },
  { color: '#BA7517', borderColor: '#FAC775', trackColor: 'rgba(186,117,23,0.15)', riskBg: '#BA7517', riskColor: '#fff' },
  { color: '#534AB7', borderColor: '#CECBF6', trackColor: 'rgba(83,74,183,0.15)', riskBg: '#534AB7', riskColor: '#fff' },
  { color: '#1D9E75', borderColor: '#C0DD97', trackColor: 'rgba(29,158,117,0.15)', riskBg: '#1D9E75', riskColor: '#fff' },
  { color: '#8B7BFF', borderColor: '#D4CEFF', trackColor: 'rgba(139,123,255,0.15)', riskBg: '#8B7BFF', riskColor: '#fff' },
]

const INSIGHT_COLORS = [
  { color: '#BA7517', borderColor: '#FAC775' },
  { color: '#534AB7', borderColor: '#CECBF6' },
  { color: '#1D9E75', borderColor: '#9FE1CB' },
]

const ACTION_COLORS: Record<string, { color: string; borderColor: string }> = {
  ALTA: { color: '#E24B4A', borderColor: '#F7C1C1' },
  MED: { color: '#BA7517', borderColor: '#FAC775' },
  BAJA: { color: '#1D9E75', borderColor: '#9FE1CB' },
}

// ─── Construir ReportData desde respuesta de Claude ──
export function buildReportData(project: any, rawAiData: any, dateInfo: any, editionNumber: number, teaser: boolean, previous?: PreviousMetrics | null, research?: ReportResearch | null): ReportData {
  const now = new Date()
  const nextReport = getNextReportDate(project.frequency, now)
  const companyName = project.companyName || project.name || 'Tu Empresa'
  const industry = project.setup?.industry || 'Tu industria'
  const projectCompetitors = registeredDirectCompetitors(project.setup)

  // Reglas de evaluación aplicadas por el sistema (sumas de rúbrica, coherencia de alertas, riesgos externos,
  // tamaños de lista) antes de calcular nada. Ver reportEnforcement.ts.
  const { aiData, audit } = enforceRubrics(rawAiData, projectCompetitors.map((c: any) => c.name), {
    companyName,
    research: research ? { log: research.log, window: research.window, client: { name: companyName, website: project.setup?.website } } : undefined,
  })

  // Métricas calculadas a partir de la evidencia (ver reportScoring.ts), con las mismas listas que se muestran.
  const scoringInput = {
    competitors: aiData.competitors,
    threatPool: [...(aiData.competitors || []), ...(aiData.secondaryCompetitors || [])],
    changes: [...(aiData.changesCol1 || []).slice(0, 6), ...(aiData.changesCol2 || []).slice(0, 6)],
    criticalAlerts: (aiData.criticalAlerts || []).slice(0, 3),
    mediumAlerts: (aiData.mediumAlerts || []).slice(0, 4),
    opportunities: (aiData.opportunities || []).slice(0, 4),
    rivalWeaknesses: aiData.rivalWeaknesses,
    highRisks: (aiData.highRisks || []).slice(0, 3),
    mediumRisks: aiData.mediumRisks,
    priceTrends: aiData.priceTrends,
  }
  const counts = computeCounts(scoringInput)
  const scores = computeScores(scoringInput)
  const deltas = computeDeltas({ signalsCount: counts.signalsCount, competitivePressure: scores.competitivePressure }, previous)

  const pressure = scores.competitivePressure
  const opportunity = scores.opportunityScore
  const gauge = calcGauge(pressure)
  const opportunityDash = Math.round((opportunity / 100) * 289)

  // Enriquecer competidores con colores
  // Si Claude no devolvió competidores se listan los registrados, sin amenaza (no hay evidencia para medirla).
  const competitors = (aiData.competitors || projectCompetitors.slice(0, 4).map((c: any) => ({
    name: c.name,
    scope: 'Nacional',
    threat: 0,
    growth: '→ Sin cambios verificables',
    recentMove: 'Sin datos suficientes esta semana',
    riskLabel: 'BAJO',
  }))).map((c: any, i: number) => {
    const palette = COMPETITOR_COLORS[i % COMPETITOR_COLORS.length]
    const initials = c.name.slice(0, 2).toUpperCase()
    const threatPct = (c.threat / 10) * 100

    const riskColors: Record<string, any> = {
      CRÍTICO: { riskBg: '#E24B4A', riskColor: '#fff', riskBorder: '#E24B4A' },
      VIGILAR: { riskBg: '#BA7517', riskColor: '#fff', riskBorder: '#BA7517' },
      MEDIO: { riskBg: '#534AB7', riskColor: '#fff', riskBorder: '#534AB7' },
      BAJO: { riskBg: '#EAF3DE', riskColor: '#27500A', riskBorder: '#C0DD97' },
    }

    return {
      rank: i + 1,
      initials,
      name: c.name,
      scope: c.scope || 'Nacional',
      category: 'Competidor directo',
      categoryLabel: inferBusinessType(project.setup || {}),
      tagBg: '#FCEBEB',
      tagColor: '#A32D2D',
      ...palette,
      threat: c.threat,
      threatPct,
      growth: c.growth || '→ Estable',
      growthColor: c.growth?.includes('↑') ? '#1D9E75' : c.growth?.includes('↓') ? '#E24B4A' : '#888',
      recentMove: c.recentMove || 'Sin movimientos detectados',
      ...(riskColors[c.riskLabel] || riskColors['MEDIO']),
      riskLabel: c.riskLabel || 'MEDIO',
    }
  })

  // Top competidores (para resumen página 1)
  const topCompetitors = competitors.slice(0, 4).map((c: any) => ({
    initials: c.initials,
    name: c.name,
    color: c.color,
    borderColor: c.borderColor,
    trackColor: c.trackColor,
    threat: c.threat,
    threatPct: c.threatPct,
  }))

  // Insights con colores
  const insights = (aiData.insights || []).slice(0, 3).map((ins: any, i: number) => ({
    ...INSIGHT_COLORS[i % INSIGHT_COLORS.length],
    category: ins.category,
    text: ins.text,
  }))

  // Acciones con colores
  const actions = (aiData.actions || []).slice(0, 3).map((act: any) => ({
    ...(ACTION_COLORS[act.priority] || ACTION_COLORS['MED']),
    priority: act.priority,
    text: act.text,
  }))

  // Alertas críticas con defaults de color
  // Sección "acción inmediata": alertas CRÍTICAS primero y luego las ALTAS (umbral de urgencia).
  const criticalAlerts = (aiData.criticalAlerts || []).slice(0, 3)
    .map((a: any) => {
      const level = alertLevelOf(a)
      return level === 'CRÍTICA'
        ? { ...a, level, levelLabel: 'Crítico', levelLabelUpper: 'CRÍTICO', levelTone: 'bad', levelColor: '#E24B4A', levelBorder: '#F7C1C1' }
        : { ...a, level, levelLabel: 'Alto', levelLabelUpper: 'ALTO', levelTone: 'warn', levelColor: '#D9822B', levelBorder: '#F5D3A8' }
    })
    .sort((x: any, y: any) => (x.level === y.level ? 0 : x.level === 'CRÍTICA' ? -1 : 1))
  const mediumAlerts = (aiData.mediumAlerts || []).slice(0, 4)

  // Oportunidades con colores
  const oppColors = [
    { headerBg: '#1D9E75', border: '#C0DD97', accentColor: '#1D9E75', actionBg: '#EAF3DE', actionColor: '#27500A', actionLabel: 'ACTUAR YA' },
    { headerBg: '#1D9E75', border: '#C0DD97', accentColor: '#1D9E75', actionBg: '#EAF3DE', actionColor: '#27500A', actionLabel: 'ACTUAR YA' },
    { headerBg: '#27896A', border: '#9FE1CB', accentColor: '#27896A', actionBg: '#D0EFDF', actionColor: '#085041', actionLabel: 'PLANIFICAR' },
    { headerBg: '#27896A', border: '#9FE1CB', accentColor: '#27896A', actionBg: '#D0EFDF', actionColor: '#085041', actionLabel: 'PLANIFICAR' },
  ]
  const opportunities = (aiData.opportunities || []).slice(0, 4).map((opp: any, i: number) => ({
    ...oppColors[i % oppColors.length],
    ...opp,
  }))

  // Riesgos altos con dash calculado
  const highRisks = (aiData.highRisks || []).slice(0, 3).map((r: any) => {
    // Impacto evaluado por Claude con la rúbrica (1-10); antes era la probabilidad entre 10.
    const impact = Number.isFinite(Number(r.impact)) && Number(r.impact) > 0 ? Math.min(10, Math.round(Number(r.impact))) : null
    const frac = impact !== null ? impact / 10 : 0
    return {
      ...r,
      impactDash: Math.round(frac * 150),
      impactGap: Math.round(150 - frac * 150),
      impact: impact ?? '—',
    }
  })

  // Cambios enriquecidos con colores
  const changeColors: Record<string, any> = {
    PRECIO: { color: '#E24B4A', borderColor: '#F7C1C1' },
    TALENTO: { color: '#BA7517', borderColor: '#FAC775' },
    EXPANSIÓN: { color: '#534AB7', borderColor: '#CECBF6' },
    PRODUCTO: { color: '#1D9E75', borderColor: '#C0DD97' },
    CAMPAÑA: { color: '#E24B4A', borderColor: '#F7C1C1' },
    MEDIOS: { color: '#BA7517', borderColor: '#FAC775' },
    ALIANZA: { color: '#534AB7', borderColor: '#CECBF6' },
  }

  const enrichChange = (ch: any) => {
    const cat = ch.category?.split('·')[0]?.trim() || 'OTRO'
    return { ...changeColors[cat] || { color: '#888', borderColor: '#ddd' }, ...ch }
  }

  const changesCol1 = (aiData.changesCol1 || []).slice(0, 6).map(enrichChange)
  const changesCol2 = (aiData.changesCol2 || []).slice(0, 6).map(enrichChange)

  // Price trends con colores
  const priceTrends = (aiData.priceTrends || []).map((pt: any) => ({
    ...pt,
    color: pt.change?.includes('↑') ? '#1D9E75' : pt.change?.includes('↓') ? '#E24B4A' : '#888',
  }))

  // Dominant messages con colores
  const msgColors = ['#534AB7', '#BA7517', '#1D9E75', '#E24B4A']
  const dominantMessages = (aiData.dominantMessages || []).slice(0, 3).map((dm: any, i: number) => ({
    ...dm,
    color: msgColors[i % msgColors.length],
  }))

  // Rival weaknesses con colores
  const weakColors = ['#FF6B6B', '#F2C063', '#8B7BFF', '#4ECDC4']
  const rivalWeaknesses = (aiData.rivalWeaknesses || []).map((rw: any, i: number) => ({
    ...rw,
    color: weakColors[i % weakColors.length],
  }))

  // Gauge metrics estándar (basados en scores de AI)
  const gaugeMetrics = [
    { label: 'PRESIÓN COMPETITIVA', value: pressure, status: pressure > 75 ? 'MUY ALTO' : pressure > 50 ? 'MODERADO' : 'BAJO', color: '#534AB7', bg: '#F8F7FF', border: '#CECBF6', labelColor: '#534AB7', trackColor: '#CECBF6', textColor: '#26215C', dash: Math.round((pressure / 100) * 226), gap: Math.round(226 - (pressure / 100) * 226) },
    { label: 'ACTIVIDAD CAMPAÑAS', value: scores.campaignActivity, status: scores.campaignActivity > 75 ? 'MUY ALTO' : scores.campaignActivity > 50 ? 'MODERADO' : 'BAJO', color: '#BA7517', bg: '#FAEEDA', border: '#FAC775', labelColor: '#854F0B', trackColor: '#FAC775', textColor: '#633806', dash: Math.round((scores.campaignActivity / 100) * 226), gap: Math.round(226 - (scores.campaignActivity / 100) * 226) },
    { label: 'OPORTUNIDAD DE MERCADO', value: opportunity, status: opportunity > 70 ? 'ALTO' : opportunity > 40 ? 'MODERADO' : 'BAJO', color: '#1D9E75', bg: '#EAF3DE', border: '#C0DD97', labelColor: '#3B6D11', trackColor: '#C0DD97', textColor: '#085041', dash: Math.round((opportunity / 100) * 226), gap: Math.round(226 - (opportunity / 100) * 226) },
    { label: 'NIVEL DE RIESGO', value: scores.marketRisk, status: scores.riskLevel, color: '#E24B4A', bg: '#FCEBEB', border: '#F7C1C1', labelColor: '#A32D2D', trackColor: '#F7C1C1', textColor: '#501313', dash: Math.round((scores.marketRisk / 100) * 226), gap: Math.round(226 - (scores.marketRisk / 100) * 226) },
  ]

  // Sector metrics derivados
  const sectorMetrics = [
    { label: 'SEÑALES DETECTADAS', value: String(counts.signalsCount), sub: 'esta semana', color: '#534AB7' },
    { label: 'MOVIMIENTOS', value: String(counts.movementsCount), sub: `en ${competitors.length} competidores`, color: '#E24B4A' },
    { label: 'ALERTAS CRÍTICAS Y ALTAS', value: String(criticalAlerts.length), sub: 'requieren acción', color: '#BA7517' },
    { label: 'OPORTUNIDADES', value: String(opportunities.length), sub: 'identificadas', color: '#1D9E75' },
    { label: 'NIVEL DE RIESGO', value: scores.riskLevel, sub: 'mercado actual', color: '#8B7BFF' },
  ]

  // Target segments
  const targetSegments = aiData.targetSegments || [
    { name: 'SEGMENTO PRINCIPAL', pct: 0, color: '#1D9E75', bg: '#EAF3DE', trackColor: '#C0DD97', desc: `${competitors.length} competidores registrados — sin datos suficientes para segmentar` },
  ]

  // New channels — fallback rota entre un pool más amplio si Claude no genera recomendaciones,
  // usando el id del proyecto para variar la selección entre reportes distintos
  const channelPool = [
    { icon: '📲', channel: 'WhatsApp Business API', desc: 'Atención y ventas directas', reason: 'Canal de bajo costo con alta tasa de respuesta en LATAM' },
    { icon: '💼', channel: 'LinkedIn Ads B2B', desc: 'Segmento ejecutivo', reason: 'Permite segmentar por cargo e industria con precisión' },
    { icon: '🎯', channel: 'Programmatic Display', desc: 'Retargeting avanzado', reason: 'Recupera visitantes que no convirtieron en su primera visita' },
    { icon: '🛒', channel: 'Marketplace especializado del sector', desc: 'Visibilidad ante compradores activos', reason: 'Tráfico ya calificado buscando el producto o servicio' },
    { icon: '🤝', channel: 'Partnerships estratégicos', desc: 'Alianzas con negocios complementarios', reason: 'Acceso a base de clientes ya validada sin costo de adquisición' },
    { icon: '✉️', channel: 'Email marketing automatizado', desc: 'Nutrición de leads a bajo costo', reason: 'Mejora retención y reactiva prospectos fríos' },
    { icon: '📍', channel: 'SEO local', desc: 'Visibilidad en búsquedas cercanas', reason: 'Captura demanda con intención de compra inmediata' },
    { icon: '🎤', channel: 'Eventos y ferias del sector', desc: 'Generación de contactos calificados', reason: 'Construye confianza y cierra ciclos de venta más rápido' },
  ]
  const poolSeed = (project.id ? project.id.toString() : 'default').split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0)
  const rotatedPool = [...channelPool.slice(poolSeed % channelPool.length), ...channelPool.slice(0, poolSeed % channelPool.length)]
  const newChannels = aiData.newChannels || rotatedPool.slice(0, 3)

  // Rival advantages
  const rivalAdvantages = aiData.rivalAdvantages || [
    { icon: '🥇', text: 'Mayor inversión publicitaria detectada', bg: '#FCEBEB', border: '#F7C1C1', textColor: '#A32D2D' },
    { icon: '🥇', text: 'Expansión geográfica activa', bg: '#FCEBEB', border: '#F7C1C1', textColor: '#A32D2D' },
    { icon: '✅', text: 'Tu ventaja: servicio personalizado + datos reales', bg: '#EAF3DE', border: '#C0DD97', textColor: '#27500A' },
  ]

  // Nombre del rival líder — viene de Claude o se infiere del competidor #1 del ranking
  const rivalLeaderName = aiData.rivalLeaderName || competitors[0]?.name || 'Sin datos suficientes'

  // Benchmark rows HTML — generado dinámicamente
  // Benchmark desde datos de Claude
  const benchmarkData = aiData.benchmarkRows || []
  const benchmarkRowsHTML = benchmarkData.length > 0
    ? benchmarkData.map((row: any, i: number) => {
        const bg = i % 2 === 1 ? 'background:#FAFAFA;' : ''
        const clientVal = row.client || 'N/A'
        const clientBg = clientVal === 'N/A' ? '#F5F5F5' : '#EAF3DE'
        const clientColor = clientVal === 'N/A' ? '#888' : '#27500A'
        const comp1 = row.comp1 || 'N/A'
        const comp2 = row.comp2 || 'N/A'
        const comp3 = row.comp3 || 'N/A'
        const comp4 = row.comp4 || 'N/A'
        const comp5 = row.comp5 || 'N/A'
        const pos = row.position || '—'
        const posColor = pos.includes('1') ? '#1D9E75' : pos.includes('2') ? '#BA7517' : '#888'
        return `<tr style="${bg}">
          <td style="font-size:10px;font-weight:600;color:#1A1730">${row.factor || ''}</td>
          <td style="text-align:center"><span style="background:${clientBg};color:${clientColor};font-size:9px;font-weight:700;padding:2px 7px;border-radius:6px">${clientVal}</span></td>
          <td style="text-align:center;font-size:9px;color:#555;font-weight:600">${comp1}</td>
          <td style="text-align:center;font-size:9px;color:#555;font-weight:600">${comp2}</td>
          <td style="text-align:center;font-size:9px;color:#555;font-weight:600">${comp3}</td>
          <td style="text-align:center;font-size:9px;color:#555;font-weight:600">${comp4}</td>
          <td style="text-align:center;font-size:9px;color:#555;font-weight:600">${comp5}</td>
          <td style="text-align:center;font-size:9px;font-weight:700;color:${posColor}">${pos}</td>
        </tr>`
      }).join('\n')
    : ['💰 Precio', '⭐ Servicios', '💡 Innovación', '🚀 Velocidad', '🏆 Marca', '📊 Presencia digital', '🔄 Retención', '🌍 Cobertura'].map((factor, i) => {
        const bg = i % 2 === 1 ? 'background:#FAFAFA;' : ''
        return `<tr style="${bg}"><td style="font-size:10px;font-weight:600;color:#1A1730">${factor}</td><td style="text-align:center"><span style="background:#EAF3DE;color:#27500A;font-size:9px;font-weight:700;padding:2px 7px;border-radius:6px">N/A</span></td><td style="text-align:center;font-size:9px;color:#888">N/A</td><td style="text-align:center;font-size:9px;color:#888">N/A</td><td style="text-align:center;font-size:9px;color:#888">N/A</td><td style="text-align:center;font-size:9px;color:#888">N/A</td><td style="text-align:center;font-size:9px;color:#888">N/A</td><td style="text-align:center;font-size:9px;color:#888">—</td></tr>`
      }).join('\n')

  // Weekly plans HTML
  const comp1 = competitors[0]?.name || 'Competidor A'
  const comp2 = competitors[1]?.name || 'Competidor B'
  const comp3 = competitors[2]?.name || 'Competidor C'


  const weeklyPlansHTML = `
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px">
    <div style="border:1.5px solid #F7C1C1;border-radius:12px;overflow:hidden">
      <div style="background:#E24B4A;padding:9px 12px">
        <div style="font-size:7px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:.08em;margin-bottom:1px;text-transform:uppercase">Semana 1 · Primeros 7 días</div>
        <div style="font-size:12px;font-weight:800;color:#fff">Defensa activa</div>
      </div>
      <div style="padding:12px;display:flex;flex-direction:column;gap:6px">
        ${(aiData.criticalSignals || [`Monitoreo diario de ${comp1}`, `Seguimiento de ${comp2}`, 'Retención de clientes clave', 'Confirmar o descartar alertas']).slice(0,4).map((s: string) => `
        <div style="display:flex;align-items:flex-start;gap:7px"><div style="width:14px;height:14px;border-radius:50%;background:#FCEBEB;border:2px solid #F7C1C1;flex-shrink:0;margin-top:1px"></div><div style="font-size:10px;color:#444;line-height:1.4">${s}</div></div>`).join('')}
      </div>
    </div>
    <div style="border:1.5px solid #FAC775;border-radius:12px;overflow:hidden">
      <div style="background:#BA7517;padding:9px 12px">
        <div style="font-size:7px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:.08em;margin-bottom:1px;text-transform:uppercase">Semana 2 · 8-14 días</div>
        <div style="font-size:12px;font-weight:800;color:#fff">Expansión y respuesta</div>
      </div>
      <div style="padding:12px;display:flex;flex-direction:column;gap:6px">
        ${(aiData.importantSignals || [`Lanzar piloto en nuevos mercados`, `Seguimiento de ${comp3}`, 'Activar canal digital adicional', 'Medir eficiencia publicitaria']).slice(0,4).map((s: string) => `
        <div style="display:flex;align-items:flex-start;gap:7px"><div style="width:14px;height:14px;border-radius:50%;background:#FAEEDA;border:2px solid #FAC775;flex-shrink:0;margin-top:1px"></div><div style="font-size:10px;color:#444;line-height:1.4">${s}</div></div>`).join('')}
      </div>
    </div>
    <div style="border:1.5px solid #CECBF6;border-radius:12px;overflow:hidden">
      <div style="background:#534AB7;padding:9px 12px">
        <div style="font-size:7px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:.08em;margin-bottom:1px;text-transform:uppercase">Semanas 3-4 · 15-30 días</div>
        <div style="font-size:12px;font-weight:800;color:#fff">Consolidación</div>
      </div>
      <div style="padding:12px;display:flex;flex-direction:column;gap:6px">
        ${(aiData.infoSignals || ['Monitorear nuevo jugador en sector', 'Actualizar materiales comerciales', 'Revisión de equipo y talento', 'Análisis SEO y keywords']).slice(0,4).map((s: string) => `
        <div style="display:flex;align-items:flex-start;gap:7px"><div style="width:14px;height:14px;border-radius:50%;background:#EEEDFE;border:2px solid #CECBF6;flex-shrink:0;margin-top:1px"></div><div style="font-size:10px;color:#444;line-height:1.4">${s}</div></div>`).join('')}
      </div>
    </div>
  </div>`

  return {
    bodyClass: teaser ? 'is-teaser' : '',

    // Meta
    companyName,
    industry,
    targetMarket: project.setup?.targetMarket || 'LATAM',
    tags: (() => {
      const bt = inferBusinessType(project.setup || {})
      const country = project.setup?.country || 'México'
      const scope = (project.setup?.geographicScope || ['Regional'])[0]
      return [bt.split(' ')[0], 'Marketing Digital', country, scope]
    })(),
    weekNumber: dateInfo.weekNumber,
    year: dateInfo.year,
    edition: editionNumber,
    periodStart: dateInfo.periodStart,
    periodEnd: dateInfo.periodEnd,
    generatedAt: dateInfo.generatedAt,
    nextMonth: dateInfo.nextMonth,
    nextReportDate: dateInfo.nextReportDate,
    nextReportTime: project.deliveryTime || '07:00',
    nextEdition: editionNumber + 1,
    deliveryChannel: project.deliveryChannel === 'BOTH' ? 'Email + WhatsApp' : project.deliveryChannel === 'WHATSAPP' ? 'WhatsApp' : 'Email',
    frequency: getFrequencyLabel(project.frequency),
    activeAreas: (project.setup?.focusAreas || []).length,
    competitorsCount: competitors.length,

    // Scores (calculados en reportScoring.ts)
    competitivePressure: pressure,
    clientScore: aiData.clientScore || null,
    opportunityScore: opportunity,
    marketRisk: scores.marketRisk,
    riskLevel: scores.riskLevel,
    generalTrend: aiData.generalTrend || 'Sin tendencia identificada',
    trendDelta: deltas.trendDeltaText,
    trendDeltaText: deltas.trendDeltaText,
    signalsDeltaText: deltas.signalsDeltaText,
    signalsDeltaShort: deltas.signalsDeltaShort,
    metrics: {
      scoringVersion: SCORING_VERSION,
      ...counts,
      competitivePressure: scores.competitivePressure,
      opportunityScore: scores.opportunityScore,
      marketRisk: scores.marketRisk,
      riskLevel: scores.riskLevel,
      campaignActivity: scores.campaignActivity,
      components: scores.components,
      enforcement: auditSummary(audit),
      evidenceQuality: audit.evidenceQuality,
      ...(research ? { search: researchSummary(research.plan, research.log, research.coverage), model: REPORT_MODEL, promptVersion: research.promptVersion } : {}),
    },
    pressureDash: gauge.pressureDash,
    opportunityDash,
    gaugePath: gauge.gaugePath,
    needleX: gauge.needleX,
    needleY: gauge.needleY,

    // KPIs
    signalsCount: counts.signalsCount,
    signalsDelta: deltas.signalsDeltaShort,
    movementsCount: counts.movementsCount,
    criticalMovements: counts.criticalMovements,
    minorMovements: counts.minorMovements,
    alertsCount: counts.alertsCount,
    activeCompetitors: competitors.length,
    totalChanges: counts.totalChanges,

    // Página 1
    insights,
    actions,
    topCompetitors,
    earlyWarning: aiData.earlyWarning || 'Monitoreo activo en curso.',

    // Página 2
    marketStatus: aiData.marketStatus || 'Mercado en seguimiento',
    marketStatusDesc: aiData.marketStatusDesc || 'Análisis actualizado esta semana.',
    gaugeMetrics,
    sectorMetrics,
    mainAlertTitle: aiData.mainAlertTitle || 'Sin alertas críticas esta semana',
    mainAlertDesc: aiData.mainAlertDesc || 'El mercado muestra actividad normal.',
    mainAlertLevel: aiData.mainAlertLevel || 'BAJO',

    // Página 3
    competitors,
    mostAggressiveName: aiData.mostAggressiveName || comp1,
    mostAggressiveDesc: aiData.mostAggressiveDesc || 'Competidor con mayor actividad detectada.',
    weakestName: aiData.weakestName || comp3,
    weakestDesc: aiData.weakestDesc || 'Sin movimientos significativos detectados.',
    emergingName: aiData.emergingName || comp2,
    emergingDesc: aiData.emergingDesc || 'Crecimiento sostenido en métricas digitales.',

    // Página 4
    criticalAlertsCount: counts.criticalAlertsCount,
    highAlertsCount: counts.highAlertsCount,
    mediumAlertsCount: mediumAlerts.length,
    criticalAlerts,
    mediumAlerts,

    // Página 5
    changesCol1,
    changesCol2,

    // Página 6
    priceTrends,
    priceTrendAlert: aiData.priceTrendAlert || `Monitoreo de precios activo en sector ${industry}`,
    dominantMessages,
    targetSegments,
    newChannels,
    rivalAdvantages,
    rivalLeaderName,

    // Página 7
    opportunitiesCount: opportunities.length,
    opportunities,
    rivalWeaknesses,

    // Página 8
    highRisksCount: highRisks.length,
    mediumRisksCount: (aiData.mediumRisks || []).length,
    highRisks,
    mediumRisks: aiData.mediumRisks || [],

    // Página 9
    benchmarkFactors: 8,
    benchmarkCompetitors: Array.from({ length: 5 }, (_, i) => ({ name: competitors[i]?.name || '—' })),
    benchmarkRowsHTML,
    radarPoints: '0,-56 49,-20 55,28 0,65 -55,28 -46,-24',
    strengths: (aiData.strengths || ['Servicio personalizado', 'Retención de clientes', 'Agilidad de respuesta', 'Conocimiento del mercado local', 'Flexibilidad operativa']).slice(0, 5),
    improvements: (aiData.improvements || ['Presencia digital', 'Cobertura geográfica', 'Inversión publicitaria', 'Automatización de procesos', 'Diversificación de canales']).slice(0, 5),

    // Página 10
    highPriorityRecs: (aiData.highPriorityRecs || []).map((rec: any) => {
      const diffMap: Record<string, {color: string, label: string}> = {
        'FACIL': { color: '#1D9E75', label: 'Fácil de implementar' },
        'MEDIO': { color: '#F2C063', label: 'Implementación media' },
        'DIFICIL': { color: '#E24B4A', label: 'Complejo de implementar' },
      }
      const timeMap: Record<string, {color: string, label: string}> = {
        'CORTO': { color: '#1D9E75', label: 'Tiempo corto' },
        'MEDIO': { color: '#F2C063', label: 'Tiempo medio' },
        'LARGO': { color: '#E24B4A', label: 'Tiempo largo' },
      }
      const costMap: Record<string, {color: string, label: string}> = {
        'BAJO': { color: '#1D9E75', label: 'Bajo costo' },
        'MEDIO': { color: '#F2C063', label: 'Inversión media' },
        'ALTO': { color: '#E24B4A', label: 'Alta inversión' },
      }
      // El prompt v2 pide "FÁCIL", "DIFÍCIL" o "BAJO (menos $5,000 MXN)": se normaliza a la primera palabra sin acentos.
      const key = (v: unknown, fallback: string) => {
        const k = typeof v === 'string' ? v.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().split(/[\s(]/)[0].toUpperCase() : ''
        return k || fallback
      }
      const diff = diffMap[key(rec.difficulty, 'MEDIO')] || diffMap['MEDIO']
      const time = timeMap[key(rec.timeRequired, 'MEDIO')] || timeMap['MEDIO']
      const cost = costMap[key(rec.costRequired, 'BAJO')] || costMap['BAJO']
      return {
        ...rec,
        difficultyColor: diff.color, difficultyLabel: diff.label,
        timeColor: time.color, timeLabel: time.label,
        costColor: cost.color, costLabel: cost.label,
      }
    }),
    mediumPriorityRecs: aiData.mediumPriorityRecs || [],
    lowPriorityRecs: aiData.lowPriorityRecs || [],

    // Competidores secundarios — garantiza mínimo 3, con fallback "No se encontraron datos"
    // como red de seguridad si Claude no cumple la instrucción del prompt
    secondaryCompetitors: (() => {
      const fromAI = (aiData.secondaryCompetitors || []).slice(0, 8)
      const minRequired = 3
      const padded = [...fromAI]
      while (padded.length < minRequired) {
        padded.push({
          name: 'No se encontraron datos',
          category: 'No se encontraron datos',
          recentMove: 'No se encontraron datos',
          threat: 0,
        })
      }
      return padded.map((c: any, i: number) => {
        const palette = COMPETITOR_COLORS[i % COMPETITOR_COLORS.length]
        return {
          initials: c.name === 'No se encontraron datos' ? '—' : (c.name || 'XX').slice(0, 2).toUpperCase(),
          name: c.name || 'Desconocido',
          category: c.category || 'Agencia Digital',
          recentMove: c.recentMove || 'Sin datos públicos disponibles',
          threat: c.threat || 0,
          ...palette,
        }
      })
    })(),

    // Página 11
    weeklyPlans: [],
    weeklyPlansHTML,
    criticalSignals: aiData.criticalSignals || ['Movimiento de precios rival', 'Lanzamiento de producto', 'Alianza estratégica', 'Nuevo jugador'],
    importantSignals: (aiData.importantSignals || ['CPL supera umbral', 'Viralización en redes', 'Contrataciones clave', 'Reseñas negativas']).slice(0, 5),
    infoSignals: aiData.infoSignals || ['Rankings App Store', 'Menciones en medios', 'Movimiento keywords SEO', 'Cambios regulatorios'],
  }
}


// ─── Calcular próxima fecha de entrega según frecuencia real,
//     saltando fines de semana (sábado y domingo son inhábiles) ──
//
// IMPORTANTE: el servidor (Railway) corre en UTC. Si hacemos aritmética de fechas
// directo sobre `new Date()` y solo convertimos a hora de México al MOSTRAR el
// resultado, el cambio de zona horaria puede mover el día de calendario hacia atrás
// (ej: lunes 1:14am UTC se muestra como domingo 7:14pm en México). Por eso esta
// función primero "ancla" la fecha al día de calendario correcto en México,
// y solo entonces hace la aritmética de días.
function toMexicoCalendarDate(date: Date): Date {
  // Extrae año/mes/día tal como se ven en hora de México, y construye
  // una fecha "neutra" a mediodía para evitar problemas de límite de día por DST
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date)
  const y = parts.find(p => p.type === 'year')!.value
  const m = parts.find(p => p.type === 'month')!.value
  const d = parts.find(p => p.type === 'day')!.value
  return new Date(`${y}-${m}-${d}T12:00:00`)
}

function isWeekend(date: Date): boolean {
  const day = date.getDay() // 0 = domingo, 6 = sábado
  return day === 0 || day === 6
}

function skipToNextBusinessDay(date: Date): Date {
  const result = new Date(date)
  while (isWeekend(result)) {
    result.setDate(result.getDate() + 1)
  }
  return result
}

function getNextReportDate(frequency: string, from: Date): Date {
  // Ancla a la fecha de calendario de México ANTES de sumar días —
  // así toda la aritmética siguiente es correcta sin importar la hora UTC del servidor
  const anchor = toMexicoCalendarDate(from)
  switch (frequency) {
    case 'DAILY': {
      const next = new Date(anchor)
      next.setDate(next.getDate() + 1)
      return skipToNextBusinessDay(next)
    }
    case 'WEEKLY': {
      const next = new Date(anchor)
      next.setDate(next.getDate() + 7)
      return skipToNextBusinessDay(next)
    }
    case 'BIWEEKLY': {
      const next = new Date(anchor)
      next.setDate(next.getDate() + 15)
      return skipToNextBusinessDay(next)
    }
    case 'MONTHLY': {
      const next = new Date(anchor)
      next.setMonth(next.getMonth() + 1)
      return skipToNextBusinessDay(next)
    }
    default: {
      const next = new Date(anchor)
      next.setDate(next.getDate() + 7)
      return skipToNextBusinessDay(next)
    }
  }
}

// Mantiene compatibilidad con código existente que use días simples (no usado para fechas finales)
function getNextReportDelta(frequency: string): number {
  switch (frequency) {
    case 'DAILY': return 1
    case 'WEEKLY': return 7
    case 'BIWEEKLY': return 15
    case 'MONTHLY': return 30
    default: return 7
  }
}

function getFrequencyLabel(frequency: string): string {
  switch (frequency) {
    case 'DAILY': return 'Diario'
    case 'WEEKLY': return 'Semanal'
    case 'BIWEEKLY': return 'Quincenal'
    case 'MONTHLY': return 'Mensual'
    default: return 'Semanal'
  }
}

// ─── Función principal: generar PDF ──────────────────
/**
 * Cuerpo de la llamada /pdf de Browserless. waitForFunction espera a que el script de las plantillas v2 termine
 * el pre-desenfoque del teaser (data-blur definido y distinto de 'pending'); solo espera en teaser v2 (is-teaser y paginas con .fit; v1 tambien usa is-teaser pero no tiene .fit), asi v1 y los reportes completos no esperan nada.
 */
export function buildPdfRequestBody(html: string) {
  return {
    html,
    options: {
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    },
    waitForFunction: {
      fn: "() => !document.body.classList.contains('is-teaser') || !document.querySelector('.fit') || (!!document.body.dataset.blur && document.body.dataset.blur !== 'pending')",
      timeout: 20000,
    },
    // Si la espera vence, Browserless imprime lo que haya en lugar de fallar la solicitud.
    bestAttempt: true,
  }
}

export async function generateReport(project: any, outputPath: string, options?: { teaser?: boolean }): Promise<string> {
  console.log(`📄 Generando reporte REAL para: ${project.companyName || project.name || 'Sin nombre'}`)

  const now = new Date()
  const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const nextReport = getNextReportDate(project.frequency, now)

  const dateInfo = {
    weekNumber: Math.ceil(now.getDate() / 7) + now.getMonth() * 4,
    year: now.getFullYear(),
    periodStart: periodStart.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Mexico_City' }),
    periodEnd: now.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Mexico_City' }),
    generatedAt: now.toLocaleDateString('es-MX', { weekday: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City' }),
    nextMonth: nextReport.toLocaleDateString('es-MX', { month: 'long', year: 'numeric', timeZone: 'America/Mexico_City' }),
    nextReportDate: nextReport.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Mexico_City' }),
  }

  // 1. Llamar a Claude con web search
  // Si Claude falla se lanza el error: el job se reintenta y, si sigue fallando, el reporte queda FAILED
  // y se avisa al usuario. Antes se emitía un PDF con números fijos que parecían reales.
  const { aiData, research } = await researchWithClaude(project, dateInfo, now)

  // 2. Construir datos completos del reporte
  const editionNumber = await prisma.report.count({ where: { projectId: project.id, status: 'COMPLETED' as any } }) + 1
  // Métricas del reporte anterior del proyecto, base del "vs anterior"
  const previousReport = await prisma.report.findFirst({
    where: { projectId: project.id, status: 'COMPLETED' as any, metricsJson: { not: Prisma.DbNull } },
    orderBy: { createdAt: 'desc' },
    select: { metricsJson: true },
  })
  const data = buildReportData(project, aiData, dateInfo, editionNumber, options?.teaser === true, previousReport?.metricsJson as PreviousMetrics | null, research)

  // 3. Cargar y renderizar template (REPORT_TEMPLATE: v1 | editorial | panel; por defecto v1)
  const templateKind = resolveReportTemplate(process.env.REPORT_TEMPLATE)
  let html: string
  if (templateKind === 'v1') {
    const templatePath = path.join(__dirname, '../templates/competitive-report.html')
    const template = fs.readFileSync(templatePath, 'utf-8')
    const logoPath = path.join(__dirname, '../assets/logo-icon.png')
    const logoBase64 = 'data:image/png;base64,' + fs.readFileSync(logoPath).toString('base64')
    html = renderTemplate(template, { ...data, logoBase64 })
  } else {
    html = renderReportHtmlV2(templateKind, data, aiData, loadReportLogos())
  }

  // 4. Generar PDF via Browserless
  const BLESS = getSecret('BLESS_KEY')
  if (!BLESS) {
    throw new Error('BLESS_KEY no está configurada — no se puede generar el PDF')
  }
  const response = await fetch(
    `https://production-sfo.browserless.io/pdf?token=${BLESS}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPdfRequestBody(html)),
    }
  )

  if (!response.ok) {
    throw new Error(`Browserless error: ${response.status} ${await response.text()}`)
  }

  const pdfBuffer = await response.arrayBuffer()
  fs.writeFileSync(outputPath, Buffer.from(pdfBuffer))
  console.log(`✅ PDF con datos reales generado: ${outputPath}`)

  // 5. Guardar sectionsJson en DB para el dashboard
  try {
    const sectionsJson = {
      // Métricas principales
      competitivePressure: data.competitivePressure,
      opportunityScore: data.opportunityScore,
      marketRisk: data.marketRisk,
      riskLevel: data.riskLevel,
      generalTrend: data.generalTrend,
      trendDelta: data.trendDelta,
      // Resumen ejecutivo
      marketStatus: data.marketStatus,
      marketStatusDesc: data.marketStatusDesc,
      earlyWarning: data.earlyWarning,
      // Alertas
      criticalAlertsCount: data.criticalAlertsCount,
      highAlertsCount: data.highAlertsCount,
      mediumAlertsCount: data.mediumAlertsCount,
      criticalAlerts: data.criticalAlerts?.slice(0, 3),
      mediumAlerts: data.mediumAlerts?.slice(0, 3),
      // Competidores
      competitors: data.competitors?.slice(0, 5),
      mostAggressiveName: data.mostAggressiveName,
      mostAggressiveDesc: data.mostAggressiveDesc,
      weakestName: data.weakestName,
      emergingName: data.emergingName,
      // Oportunidades y riesgos
      opportunities: data.opportunities?.slice(0, 4),
      highRisks: data.highRisks?.slice(0, 3),
      // Señales
      criticalSignals: data.criticalSignals,
      importantSignals: data.importantSignals,
      // Periodo
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      weekNumber: data.weekNumber,
    }

    if (project.reportId) {
      await prisma.report.update({
        where: { id: project.reportId },
        data: {
          sectionsJson,
          metricsJson: data.metrics as any,
          evidenceJson: buildEvidenceJson(research) as any,
          reportTitle: `Inteligencia Competitiva · Reporte #${data.edition} · ${data.year}`,
          pdfSizeBytes: Buffer.from(pdfBuffer).length,
          status: 'COMPLETED' as any,
        }
      })
    }
    console.log('✅ sectionsJson guardado en DB')
  } catch(e) {
    console.error('⚠️ Error guardando sectionsJson:', e)
  }

  return outputPath
}
/** Registro de investigación persistido en Report.evidenceJson (sección E.1 de reglas-busqueda-certera.md). */
export function buildEvidenceJson(research: ReportResearch) {
  return {
    generatedAt: research.window.t0,
    model: REPORT_MODEL,
    promptVersion: research.promptVersion,
    window: { today: research.window.today, reportStart: research.window.reportStart, e3Start: research.window.e3Start, e2Start: research.window.e2Start },
    search: {
      planVersion: research.plan.version,
      plan: research.plan.queries.map(q => ({ id: q.id, block: q.block, query: q.query })),
      queries: research.log.queries,
      fetches: research.log.fetches,
      citations: research.log.citations.slice(0, 300),
      coverage: { planned: research.coverage.planned, executed: research.coverage.executed, missing: research.coverage.missing.map(m => m.query) },
      usage: research.log.usage,
    },
  }
}
