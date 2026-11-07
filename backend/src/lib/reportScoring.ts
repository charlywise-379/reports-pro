// Ponderación de las métricas del reporte de inteligencia competitiva.
//
// Claude aporta la EVIDENCIA (competidores con su amenaza, cambios con su nivel, alertas, oportunidades,
// riesgos con probabilidad e impacto). Las métricas que se muestran en el reporte se CALCULAN aquí, con
// pesos fijos y documentados, para que reflejen el volumen y la gravedad de lo encontrado y no un número
// "típico" elegido por el modelo. Mismo input → mismo resultado.
//
// Cualquier cambio de pesos o fórmulas debe subir SCORING_VERSION: los "vs anterior" solo se calculan
// contra reportes medidos con la misma versión.

export const SCORING_VERSION = 1

// Peso de cada nivel de gravedad (en categorías "CAT · NIVEL", riesgos y etiquetas de los competidores).
export const LEVEL_WEIGHT: Record<string, number> = { CRÍTICO: 1, CRITICO: 1, ALTO: 0.7, MEDIO: 0.4, BAJO: 0.2 }
const DEFAULT_LEVEL_WEIGHT = 0.3 // cambio sin nivel reconocible

export const WEIGHTS = {
  // Presión competitiva = qué tan fuerte empujan hoy los competidores.
  pressure: {
    threat: 0.4,    // amenaza promedio de los 3 competidores más peligrosos (threat 1-10)
    activity: 0.35, // cambios detectados ponderados por nivel + competidores con movimiento verificable
    alerts: 0.25,   // alertas críticas (1.0) y medias (0.4)
  },
  // Oportunidad = qué tan aprovechables son los huecos encontrados.
  opportunity: {
    quality: 0.8,    // promedio ponderado de los scores de oportunidad (la mejor pesa más: 40/30/20/10)
    weaknesses: 0.2, // debilidades de rivales con evidencia
  },
  // Riesgo de mercado = probabilidad combinada de daño.
  risk: {
    high: 0.7,    // 1 − Π(1 − probabilidad × impacto/10) de los riesgos altos
    medium: 0.15, // riesgos medios
    alerts: 0.15, // alertas críticas
  },
}

// Valores que saturan cada componente (a partir de aquí el componente vale 100%).
// Se conservan las dos configuraciones revisadas para poder revertir:
// - 'inicial': la primera aprobada. Con reportes completos (3 alertas críticas + 4 medias, ~12 cambios)
//   alertas y actividad saturaban casi siempre y la presión quedaba en 76-100.
// - 'ajustada' (activa): topes más altos para que la gravedad, y no el volumen fijo del reporte, marque la diferencia.
// Para revertir: cambiar ACTIVE_SATURATION y subir SCORING_VERSION.
export const SATURATION_PRESETS = {
  inicial: {
    activityPoints: 6,      // ≈ 6 cambios críticos, o 9 altos, o 15 medios
    alertPoints: 4,         // ≈ 4 alertas críticas, o 10 medias
    rivalWeaknesses: 4,
    mediumRisks: 4,
    criticalAlertsForRisk: 3,
  },
  ajustada: {
    activityPoints: 9,      // ≈ 9 cambios críticos, o 13 altos, o 22 medios
    alertPoints: 6,         // ≈ 6 alertas críticas, o 15 medias
    rivalWeaknesses: 6,
    mediumRisks: 4,
    criticalAlertsForRisk: 5,
  },
  // 'calibrada' (activa): ninguna lista satura en su tamaño máximo (debilidades de rivales máx. 6 → satura
  // en 10; riesgos medios máx. 4 → satura en 6), para que llenar la lista no dé siempre el 100%.
  calibrada: {
    activityPoints: 9,
    alertPoints: 6,
    rivalWeaknesses: 10,
    mediumRisks: 6,
    criticalAlertsForRisk: 5,
  },
} as const
export const ACTIVE_SATURATION: keyof typeof SATURATION_PRESETS = 'calibrada'
export const SATURATION = SATURATION_PRESETS[ACTIVE_SATURATION]
const COMPETITOR_MOVE_POINTS = 0.3
// Alertas de la sección "acción inmediata": CRÍTICA pesa 1.0 y ALTA (umbral de urgencia) 0.7.
// Sin nivel declarado (prompt v1) se trata como CRÍTICA, que era su significado original.
export const ALERT_WEIGHT = { CRÍTICA: 1, ALTA: 0.7, MEDIA: 0.4 }
export function alertLevelOf(alert: any): 'CRÍTICA' | 'ALTA' {
  const l = typeof alert?.level === 'string' ? alert.level.trim().toUpperCase() : ''
  return l === 'ALTA' || l === 'ALTO' ? 'ALTA' : 'CRÍTICA'
}
const urgentAlertPoints = (alerts: any[]) => alerts.reduce((s, a) => s + ALERT_WEIGHT[alertLevelOf(a)], 0)
const OPPORTUNITY_RANK_WEIGHTS = [0.4, 0.3, 0.2, 0.1]

// Nivel de riesgo a partir del riesgo calculado (0-100).
export const RISK_LEVEL_THRESHOLDS = [
  { max: 29, level: 'BAJO' },
  { max: 54, level: 'MEDIO' },
  { max: 74, level: 'ALTO' },
  { max: 100, level: 'CRÍTICO' },
] as const

const NO_DATA = /sin datos|no detectad|sin presencia|sin cambios|sin movimiento|no disponible/i

const arr = (v: unknown): any[] => (Array.isArray(v) ? v : [])
// Solo números simples ("8", 8, "72%"); "8/10" o "Alta" se ignoran en vez de convertirse en 810 o 0.
const num = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v !== 'string' || !/^\s*-?\d+(\.\d+)?\s*%?\s*$/.test(v)) return null
  return Number(v.replace('%', ''))
}
const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
const pct = (n: number) => Math.round(clamp01(n) * 100)

/** Nivel de gravedad de una categoría tipo "PRECIO · ALTO" (o null si no trae nivel reconocible). */
export function levelOf(category: unknown): string | null {
  if (typeof category !== 'string') return null
  const parts = category.toUpperCase().split('·').map(s => s.trim())
  for (const p of parts.reverse()) if (p in LEVEL_WEIGHT) return p === 'CRITICO' ? 'CRÍTICO' : p
  return null
}
const levelWeight = (category: unknown) => {
  const l = levelOf(category)
  return l ? LEVEL_WEIGHT[l] : DEFAULT_LEVEL_WEIGHT
}

export interface ScoringInput {
  competitors?: unknown
  // Todos los competidores evaluados (principales + secundarios) para la amenaza de la presión: así el
  // resultado no depende de cuántos clasificó la IA como principales. Si falta se usa competitors.
  threatPool?: unknown
  changes?: unknown          // changesCol1 + changesCol2 tal como se muestran
  criticalAlerts?: unknown
  mediumAlerts?: unknown
  opportunities?: unknown
  rivalWeaknesses?: unknown
  highRisks?: unknown
  mediumRisks?: unknown
  priceTrends?: unknown
}

export interface ReportCounts {
  movementsCount: number
  criticalMovements: number
  minorMovements: number
  totalChanges: number
  alertsCount: number
  criticalAlertsCount: number
  highAlertsCount: number
  competitorMoves: number
  signalsCount: number
}

/** Conteos reales a partir de las listas del reporte. */
export function computeCounts(input: ScoringInput): ReportCounts {
  const changes = arr(input.changes)
  const criticalMovements = changes.filter(c => ['CRÍTICO', 'ALTO'].includes(levelOf(c?.category) || '')).length
  const priceMoves = arr(input.priceTrends).filter(p => typeof p?.change === 'string' && /^[↑↓]/.test(p.change.trim())).length
  const competitorMoves = arr(input.competitors).filter(c => typeof c?.recentMove === 'string' && c.recentMove.trim() && !NO_DATA.test(c.recentMove)).length
  const criticalAlerts = arr(input.criticalAlerts).length
  const mediumAlerts = arr(input.mediumAlerts).length
  return {
    movementsCount: changes.length,
    criticalMovements,
    minorMovements: changes.length - criticalMovements,
    totalChanges: changes.length + priceMoves,
    alertsCount: criticalAlerts,
    criticalAlertsCount: arr(input.criticalAlerts).filter(a => alertLevelOf(a) === 'CRÍTICA').length,
    highAlertsCount: arr(input.criticalAlerts).filter(a => alertLevelOf(a) === 'ALTA').length,
    competitorMoves,
    // Señal = hallazgo con evidencia: alertas, cambios, movimientos de precio, competidores activos,
    // oportunidades y riesgos detectados.
    signalsCount: criticalAlerts + mediumAlerts + changes.length + priceMoves + competitorMoves
      + arr(input.opportunities).length + arr(input.highRisks).length + arr(input.mediumRisks).length,
  }
}

export interface ScoreBreakdown {
  competitivePressure: number
  opportunityScore: number
  marketRisk: number
  riskLevel: string
  campaignActivity: number
  components: Record<string, number>
}

/** Scores 0-100 ponderados a partir de la evidencia. */
export function computeScores(input: ScoringInput): ScoreBreakdown {
  const competitors = arr(input.competitors)
  const changes = arr(input.changes)
  const urgentPoints = urgentAlertPoints(arr(input.criticalAlerts))
  const mediumAlerts = arr(input.mediumAlerts).length
  const counts = computeCounts(input)

  // Presión
  const pool = input.threatPool === undefined ? competitors : arr(input.threatPool)
  const threats = pool.map(c => num(c?.threat)).filter((t): t is number => t !== null && t > 0)
    .map(t => Math.min(10, t)).sort((a, b) => b - a).slice(0, 3)
  const threatC = threats.length ? threats.reduce((s, t) => s + t, 0) / threats.length / 10 : 0
  const activityPoints = changes.reduce((s, c) => s + levelWeight(c?.category), 0) + counts.competitorMoves * COMPETITOR_MOVE_POINTS
  const activityC = clamp01(activityPoints / SATURATION.activityPoints)
  const alertsC = clamp01((urgentPoints + mediumAlerts * ALERT_WEIGHT.MEDIA) / SATURATION.alertPoints)
  const P = WEIGHTS.pressure
  const competitivePressure = pct(P.threat * threatC + P.activity * activityC + P.alerts * alertsC)

  // Oportunidad
  const oppScores = arr(input.opportunities).map(o => num(o?.score)).filter((s): s is number => s !== null)
    .map(s => Math.max(0, Math.min(100, s))).sort((a, b) => b - a).slice(0, OPPORTUNITY_RANK_WEIGHTS.length)
  const wSum = OPPORTUNITY_RANK_WEIGHTS.slice(0, oppScores.length).reduce((s, w) => s + w, 0)
  const qualityC = oppScores.length ? oppScores.reduce((s, v, i) => s + v * OPPORTUNITY_RANK_WEIGHTS[i], 0) / wSum / 100 : 0
  // Pocas oportunidades restan, con peso menor que la calidad: 1 oportunidad cuenta al 85%, 4 o más al 100%.
  const breadth = oppScores.length ? 0.8 + 0.05 * Math.min(4, oppScores.length) : 0
  const weaknessC = clamp01(arr(input.rivalWeaknesses).length / SATURATION.rivalWeaknesses)
  const O = WEIGHTS.opportunity
  const opportunityScore = pct(O.quality * qualityC * breadth + O.weaknesses * weaknessC)

  // Riesgo
  const survival = arr(input.highRisks).reduce((s, r) => {
    const p = clamp01((num(r?.probability) ?? 0) / 100)
    const impact = num(r?.impact)
    const i = impact !== null ? clamp01(impact / 10) : 0.5 // sin impacto declarado: severidad neutra
    return s * (1 - p * i)
  }, 1)
  const highC = 1 - survival
  const mediumC = clamp01(arr(input.mediumRisks).length / SATURATION.mediumRisks)
  const alertRiskC = clamp01(urgentPoints / SATURATION.criticalAlertsForRisk)
  const R = WEIGHTS.risk
  const marketRisk = pct(R.high * highC + R.medium * mediumC + R.alerts * alertRiskC)

  return {
    competitivePressure,
    opportunityScore,
    marketRisk,
    riskLevel: riskLevelFor(marketRisk),
    campaignActivity: pct(activityC),
    components: {
      threat: pct(threatC), activity: pct(activityC), alerts: pct(alertsC),
      opportunityQuality: pct(qualityC), opportunityBreadth: Math.round(breadth * 100), rivalWeaknesses: pct(weaknessC),
      highRisks: pct(highC), mediumRisks: pct(mediumC), criticalAlerts: pct(alertRiskC),
    },
  }
}

export function riskLevelFor(risk: number): string {
  return (RISK_LEVEL_THRESHOLDS.find(t => risk <= t.max) || RISK_LEVEL_THRESHOLDS[RISK_LEVEL_THRESHOLDS.length - 1]).level
}

// ─── Comparación con el reporte anterior ──────────────────────────────────────────

export interface PreviousMetrics {
  scoringVersion?: number
  signalsCount?: number
  competitivePressure?: number
}

export interface DeltaTexts {
  signalsDeltaText: string   // "↑ +15% vs anterior" | "↓ −8% vs anterior" | "Sin cambio vs anterior" | "Primera medición"
  signalsDeltaShort: string  // "↑ +15%" | "↓ −8%" | "0%" | "—"
  trendDeltaText: string     // "vs reporte anterior +4 pts" | "Primera medición"
  hasBaseline: boolean
}

/** "vs anterior" solo si existe un reporte previo medido con la misma metodología. */
export function computeDeltas(current: { signalsCount: number; competitivePressure: number }, previous?: PreviousMetrics | null): DeltaTexts {
  const comparable = !!previous && previous.scoringVersion === SCORING_VERSION
    && Number.isFinite(previous.signalsCount) && Number.isFinite(previous.competitivePressure)
  if (!comparable) {
    return { signalsDeltaText: 'Primera medición', signalsDeltaShort: '—', trendDeltaText: 'Primera medición', hasBaseline: false }
  }
  const prevSignals = previous!.signalsCount as number
  const signalsPct = prevSignals > 0 ? Math.round(((current.signalsCount - prevSignals) / prevSignals) * 100) : (current.signalsCount > 0 ? 100 : 0)
  const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0')
  const arrow = signalsPct > 0 ? '↑ ' : signalsPct < 0 ? '↓ ' : ''
  const pts = current.competitivePressure - (previous!.competitivePressure as number)
  return {
    signalsDeltaText: signalsPct === 0 ? 'Sin cambio vs anterior' : `${arrow}${signed(signalsPct)}% vs anterior`,
    signalsDeltaShort: `${arrow}${signed(signalsPct)}%`,
    trendDeltaText: `vs reporte anterior ${signed(pts)} pts`,
    hasBaseline: true,
  }
}
