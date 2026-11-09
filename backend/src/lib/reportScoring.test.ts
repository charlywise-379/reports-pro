import { describe, it, expect } from 'vitest'
import { computeCounts, computeScores, computeDeltas, riskLevelFor, levelOf, SCORING_VERSION } from './reportScoring'

const ch = (category: string) => ({ category, title: 't' })
const comp = (threat: number, recentMove = 'Lanzó promoción el 3 nov') => ({ name: 'X', threat, recentMove })

// Escenario del ejemplo validado con el usuario
const busy = {
  competitors: [comp(9), comp(8), comp(10), comp(7), comp(4, 'Sin datos públicos disponibles')],
  changes: [ch('PRECIO · CRÍTICO'), ch('EXPANSIÓN · CRÍTICO'), ch('TALENTO · ALTO'), ch('CAMPAÑA · ALTO'), ch('MEDIOS · MEDIO'), ch('PRODUCTO · MEDIO')],
  criticalAlerts: [{}, {}, {}],
  mediumAlerts: [{}, {}, {}, {}],
}

describe('levelOf', () => {
  it('lee el nivel de "CAT · NIVEL" con o sin acento', () => {
    expect(levelOf('PRECIO · ALTO')).toBe('ALTO')
    expect(levelOf('Consolidación · Critico')).toBe('CRÍTICO')
    expect(levelOf('PRECIO')).toBeNull()
    expect(levelOf(undefined)).toBeNull()
  })
})

describe('computeCounts', () => {
  it('cuenta movimientos, críticos/menores, cambios de precio y señales', () => {
    const c = computeCounts({ ...busy, priceTrends: [{ change: '↑ subió 8%' }, { change: '→ Estable' }, { change: '↓ bajó 3%' }], opportunities: [{}, {}], highRisks: [{}], mediumRisks: [{}, {}] })
    expect(c).toEqual({
      movementsCount: 6, criticalMovements: 4, minorMovements: 2, totalChanges: 8,
      alertsCount: 3, criticalAlertsCount: 3, highAlertsCount: 0, competitorMoves: 4,
      signalsCount: 3 + 4 + 6 + 2 + 4 + 2 + 1 + 2,
    })
  })
  it('sin datos: todo en cero', () => {
    expect(computeCounts({}).signalsCount).toBe(0)
  })
})

describe('computeScores', () => {
  it('presión del ejemplo validado = 76 (topes ajustados)', () => {
    const s = computeScores(busy)
    expect(s.components).toMatchObject({ threat: 90, activity: 60, alerts: 77 })
    expect(s.competitivePressure).toBe(76)
    expect(s.campaignActivity).toBe(60)
  })

  it('menos actividad baja la presión', () => {
    const calm = { competitors: busy.competitors, changes: [ch('A · MEDIO'), ch('B · MEDIO'), ch('C · MEDIO')], criticalAlerts: [{}], mediumAlerts: [{}, {}] }
    const s = computeScores(calm)
    expect(s.competitivePressure).toBeLessThan(70)
    expect(s.competitivePressure).toBeGreaterThan(50)
  })

  it('sin evidencia todos los scores son 0 y el riesgo BAJO', () => {
    expect(computeScores({})).toMatchObject({ competitivePressure: 0, opportunityScore: 0, marketRisk: 0, riskLevel: 'BAJO' })
  })

  it('oportunidad: la mejor pesa más y pocas oportunidades restan', () => {
    const four = computeScores({ opportunities: [{ score: 90 }, { score: 80 }, { score: 70 }, { score: 60 }], rivalWeaknesses: [{}, {}, {}, {}] })
    // calidad = (90·.4+80·.3+70·.2+60·.1)/1 = 80 → 0.8·0.8·1.0 + 0.2·(4/10) = 0.72
    expect(four.opportunityScore).toBe(72)
    const one = computeScores({ opportunities: [{ score: 90 }] })
    // 0.8 · 0.9 · 0.85 = 0.612 (amplitud con menos peso que la calidad)
    expect(one.opportunityScore).toBe(61)
  })

  it('riesgo: probabilidad combinada con impacto, más riesgos medios y alertas', () => {
    const s = computeScores({ highRisks: [{ probability: 60, impact: 8 }, { probability: 50, impact: 6 }], mediumRisks: [{}, {}], criticalAlerts: [{}] })
    // high = 1 − (1−.48)(1−.30) = 0.636 → .7·.636 + .15·(2/6) + .15·(1/5) = 0.5252
    expect(s.marketRisk).toBe(53)
    expect(s.riskLevel).toBe('MEDIO') // 53: corte MEDIO 30-54
  })

  it('el mismo input da siempre el mismo resultado', () => {
    expect(computeScores(busy)).toEqual(computeScores(busy))
  })
})

describe('alertas CRÍTICA / ALTA', () => {
  it('ALTA cuenta como alerta urgente pero pesa menos que CRÍTICA', () => {
    const base = { competitors: busy.competitors, changes: busy.changes, mediumAlerts: [{}] }
    const crit = computeScores({ ...base, criticalAlerts: [{ level: 'CRÍTICA' }, { level: 'CRÍTICA' }] })
    const high = computeScores({ ...base, criticalAlerts: [{ level: 'ALTA' }, { level: 'ALTA' }] })
    const none = computeScores({ ...base, criticalAlerts: [] })
    expect(crit.competitivePressure).toBeGreaterThan(high.competitivePressure)
    expect(high.competitivePressure).toBeGreaterThan(none.competitivePressure)
    expect(computeCounts({ criticalAlerts: [{ level: 'CRÍTICA' }, { level: 'ALTA' }, { level: 'Alta' }] }))
      .toMatchObject({ alertsCount: 3, criticalAlertsCount: 1, highAlertsCount: 2 })
  })
})

describe('riskLevelFor', () => {
  it('aplica los umbrales validados', () => {
    expect([0, 29, 30, 54, 55, 74, 75, 100].map(riskLevelFor)).toEqual(['BAJO', 'BAJO', 'MEDIO', 'MEDIO', 'ALTO', 'ALTO', 'CRÍTICO', 'CRÍTICO'])
  })
})

describe('computeDeltas', () => {
  const cur = { signalsCount: 23, competitivePressure: 64 }
  it('sin reporte anterior: Primera medición', () => {
    expect(computeDeltas(cur, null)).toMatchObject({ signalsDeltaText: 'Primera medición', trendDeltaText: 'Primera medición', signalsDeltaShort: '—', hasBaseline: false })
  })
  it('reporte anterior con otra metodología no sirve de base', () => {
    expect(computeDeltas(cur, { signalsCount: 47, competitivePressure: 72 }).hasBaseline).toBe(false)
  })
  it('compara contra el anterior de la misma versión', () => {
    expect(computeDeltas(cur, { scoringVersion: SCORING_VERSION, signalsCount: 20, competitivePressure: 60 }))
      .toEqual({ signalsDeltaText: '↑ +15% vs anterior', signalsDeltaShort: '↑ +15%', trendDeltaText: 'vs reporte anterior +4 pts', hasBaseline: true })
    expect(computeDeltas(cur, { scoringVersion: SCORING_VERSION, signalsCount: 25, competitivePressure: 70 }))
      .toMatchObject({ signalsDeltaText: '↓ −8% vs anterior', trendDeltaText: 'vs reporte anterior −6 pts' })
    expect(computeDeltas(cur, { scoringVersion: SCORING_VERSION, signalsCount: 23, competitivePressure: 64 }))
      .toMatchObject({ signalsDeltaText: 'Sin cambio vs anterior', trendDeltaText: 'vs reporte anterior 0 pts' })
  })
})
