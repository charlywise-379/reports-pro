// Capa intermedia entre buildReportData y las plantillas v2. No toca los datos de v1: devuelve una
// copia enriquecida con tonos semánticos, anillos de medidor y estructuras listas para la plantilla.
import {
  Tone, toneForPressure, toneForOpportunity, toneForRisk, toneForThreat, toneForProbability,
  toneForLevel, toneForDelta, toneForPriority, priorityLabel, toneForEffort, effortLabel,
  toneForChangeCategory, toneForInsightCategory,
} from './reportPalette'

export const TOTAL_PAGES = 11
export type Skin = 'editorial' | 'panel'

const clampPct = (n: unknown): number => Math.max(0, Math.min(100, Number(n) || 0))
export const ringDash = (value: unknown, circumference: number): number =>
  Math.round((clampPct(value) / 100) * circumference)

const arr = (v: unknown): any[] => (Array.isArray(v) ? v : [])
const tagged = (list: unknown, fn: (item: any, i: number) => Record<string, unknown>): any[] =>
  arr(list).map((item, i) => ({ ...item, ...fn(item, i) }))

const BENCH_DEFAULT_FACTORS = ['Precio', 'Servicios', 'Innovación', 'Velocidad', 'Marca', 'Presencia digital', 'Retención', 'Cobertura']

// Separa la posición que entrega la IA («2do lugar — precio competitivo…», «3er lugar (competitivo)»)
// en el rango corto y la nota: corta en el primer « — », « – », « - », «:» o « (» (en ese caso
// quita el «)» final). Sin separador, todo es rango y la nota queda vacía.
const POSITION_SEPARATORS = [' — ', ' – ', ' - ', ':', ' (']
export function splitPosition(position: string): { rank: string; note: string } {
  let at = -1
  let sep = ''
  for (const s of POSITION_SEPARATORS) {
    const i = position.indexOf(s)
    if (i > 0 && (at < 0 || i < at)) { at = i; sep = s }
  }
  if (at < 0) return { rank: position.trim(), note: '' }
  let note = position.slice(at + sep.length).trim()
  if (sep === ' (' && note.endsWith(')')) note = note.slice(0, -1).trim()
  return { rank: position.slice(0, at).trim(), note }
}

// Tono por el número del rango (1 = ok, 2 = warn); los números de la nota no cuentan.
const toneForRank = (rank: string): Tone => {
  const n = Number((rank.match(/\d+/) || [])[0])
  return n === 1 ? 'ok' : n === 2 ? 'warn' : 'neutral'
}

const isEmptyCell = (v: unknown): boolean => {
  const t = String(v ?? '').trim().toUpperCase()
  return t === '' || t === 'N/A' || t === '—' || t === '-'
}

function benchmarkRows(rows: unknown): any[] {
  const list = arr(rows)
  if (list.length === 0) {
    return BENCH_DEFAULT_FACTORS.map(factor => ({
      factor, client: 'N/A', clientCls: 'is-na', c1: 'N/A', c2: 'N/A', c3: 'N/A', c4: 'N/A', c5: 'N/A',
      position: '—', positionRank: '—', positionNote: '', positionTone: 'neutral' as Tone,
    }))
  }
  return list.map(r => {
    const client = r.client || 'N/A'
    const position = String(r.position || '—')
    const { rank, note } = splitPosition(position)
    return {
      factor: r.factor || '',
      client,
      clientCls: client === 'N/A' ? 'is-na' : 'is-client',
      c1: r.comp1 || 'N/A', c2: r.comp2 || 'N/A', c3: r.comp3 || 'N/A', c4: r.comp4 || 'N/A', c5: r.comp5 || 'N/A',
      position,
      positionRank: rank,
      positionNote: note,
      positionTone: toneForRank(rank),
    }
  })
}

// Columnas de competidores del benchmark. Una columna está vacía si es N/A o vacía en TODAS las filas.
// Criterio con huecos: n = la última columna con datos (mínimo 1); las columnas vacías intermedias se
// quedan visibles (encabezado «—») para no desalinear competidor y celda; solo se ocultan las finales.
function benchmarkColumns(rows: unknown, registered: unknown): { cls: string; competitors: Array<{ name: string }> } {
  const list = arr(rows)
  const names = arr(registered)
  const used = [1, 2, 3, 4, 5].map(ci => list.some(r => !isEmptyCell(r?.[`comp${ci}`])))
  const last = used.lastIndexOf(true) + 1
  const competitors = used.map((u, i) => {
    const name = String(names[i]?.name ?? '').trim()
    const hasName = name !== '' && name !== '—'
    return { name: !u ? '—' : hasName ? name : 'Otros' }
  })
  return { cls: `cols-${Math.max(1, last)}`, competitors }
}

const effortFields = (r: any) => ({
  difficultyTone: toneForEffort(r.difficulty), difficultyLabel: effortLabel('difficulty', r.difficulty),
  timeTone: toneForEffort(r.timeRequired), timeLabel: effortLabel('time', r.timeRequired),
  costTone: toneForEffort(r.costRequired), costLabel: effortLabel('cost', r.costRequired),
})

export function buildViewModel(data: any, aiData: any, skin: Skin): any {
  const pressure = clampPct(data.competitivePressure)
  const opportunity = clampPct(data.opportunityScore)
  const risk = clampPct(data.marketRisk)
  const pressureTone = toneForPressure(pressure)
  const opportunityTone = toneForOpportunity(opportunity)
  const riskTone = toneForRisk(risk)
  const sectorTones: Tone[] = ['info', 'bad', 'warn', 'ok']
  const messageTones: Tone[] = ['info', 'warn', 'ok', 'bad']
  const segmentTones: Tone[] = ['ok', 'info', 'warn', 'neutral']
  const gaugeTones: Tone[] = [pressureTone, 'info', opportunityTone, riskTone]
  const bench = benchmarkColumns(aiData?.benchmarkRows, data.benchmarkCompetitors)

  return {
    ...data,
    bodyClass: [data.bodyClass, `skin-${skin}`].filter(Boolean).join(' '),
    totalPages: TOTAL_PAGES,

    pressureTone, opportunityTone, riskTone,
    pressureLgDash: ringDash(pressure, 440),
    riskDash: ringDash(risk, 289),
    mainAlertTone: toneForLevel(data.mainAlertLevel),

    insights: tagged(data.insights, i => ({ tone: toneForInsightCategory(i.category) })),
    actions: tagged(data.actions, a => ({ tone: toneForPriority(a.priority), priorityLabel: priorityLabel(a.priority) })),
    topCompetitors: tagged(data.topCompetitors, c => ({ tone: toneForThreat(Number(c.threat)) })),

    gaugeMetrics: tagged(data.gaugeMetrics, (_g, i) => ({ tone: gaugeTones[i] ?? 'neutral' })),
    sectorMetrics: tagged(data.sectorMetrics, (_m, i) => ({ tone: i < 4 ? sectorTones[i] : toneForLevel(data.riskLevel) })),

    competitors: tagged(data.competitors, c => ({
      threatTone: toneForThreat(Number(c.threat)),
      riskTone: toneForLevel(c.riskLabel),
      growthTone: toneForDelta(c.growth),
    })),
    secondaryCompetitors: tagged(data.secondaryCompetitors, c => ({ threatTone: toneForThreat(Number(c.threat)) })),

    changesCol1: tagged(data.changesCol1, c => ({ tone: toneForChangeCategory(c.category) })),
    changesCol2: tagged(data.changesCol2, c => ({ tone: toneForChangeCategory(c.category) })),
    criticalAlerts: arr(data.criticalAlerts),
    mediumAlerts: arr(data.mediumAlerts),

    priceTrends: tagged(data.priceTrends, p => ({ tone: toneForDelta(p.change) })),
    dominantMessages: tagged(data.dominantMessages, (_m, i) => ({ tone: messageTones[i % 4] })),
    targetSegments: tagged(data.targetSegments, (s, i) => ({ tone: segmentTones[i % 4], pct: clampPct(s.pct) })),
    newChannels: arr(data.newChannels),
    rivalAdvantages: tagged(data.rivalAdvantages, r => ({
      tone: String(r.icon || '').includes('✅') || /tu ventaja/i.test(String(r.text || '')) ? 'ok' : 'bad',
    })),

    opportunities: tagged(data.opportunities, o => ({ tone: Number(o.score) >= 75 ? 'ok' : 'info' })),
    rivalWeaknesses: arr(data.rivalWeaknesses),
    highRisks: tagged(data.highRisks, r => ({ tone: toneForProbability(Number(r.probability)) })),
    mediumRisks: arr(data.mediumRisks),

    benchmarkRows: benchmarkRows(aiData?.benchmarkRows),
    benchColsClass: bench.cls,
    benchmarkCompetitors: bench.competitors,
    strengths: arr(data.strengths),
    improvements: arr(data.improvements),

    highPriorityRecs: tagged(data.highPriorityRecs, effortFields),
    mediumPriorityRecs: tagged(data.mediumPriorityRecs, effortFields),
    lowPriorityRecs: arr(data.lowPriorityRecs),

    criticalSignals: arr(data.criticalSignals),
    importantSignals: arr(data.importantSignals),
    infoSignals: arr(data.infoSignals),
  }
}
