import { describe, it, expect } from 'vitest'
import { FIXTURE_PROJECT, FIXTURE_PROJECT_REAL, FIXTURE_DATE_INFO } from '../reportFixtures'
import { buildCompetitivePromptV1 } from './competitivePromptV1'
import { buildCompetitivePromptV2 } from './competitivePromptV2'
import { buildCompetitivePrompt, resolvePromptVersion, ACTIVE_PROMPT_VERSION } from './index'

// Métricas que calcula reportScoring.ts: no deben pedirse a la IA.
const GLOBAL_METRIC_FIELDS = [
  'competitivePressure', 'opportunityScore', 'marketRisk', 'riskLevel', 'signalsCount', 'signalsDelta',
  'movementsCount', 'criticalMovements', 'minorMovements', 'totalChanges', 'trendDelta', 'alertsCount',
]

/** Claves del esquema JSON del prompt ("clave": ...), en cualquier nivel. */
const schemaKeys = (prompt: string): Set<string> => {
  const schema = prompt.slice(prompt.indexOf('ESTRUCTURA DE RESPUESTA JSON'))
  return new Set(Array.from(schema.matchAll(/"([A-Za-z][A-Za-z0-9]*)":/g), m => m[1]))
}

describe('prompts del reporte competitivo', () => {
  for (const [name, build] of [['v1', buildCompetitivePromptV1], ['v2', buildCompetitivePromptV2]] as const) {
    it(`${name} se construye con la fixture sin lanzar`, () => {
      const p = build(FIXTURE_PROJECT, FIXTURE_DATE_INFO)
      expect(p.length).toBeGreaterThan(5000)
      expect(p).toContain('Estudio Boreal')
      expect(p).toContain(FIXTURE_DATE_INFO.periodStart)
      expect(p).toContain('"highRisks"')
      expect(() => build(FIXTURE_PROJECT_REAL, FIXTURE_DATE_INFO)).not.toThrow()
      expect(() => build({ name: 'Sin setup' }, FIXTURE_DATE_INFO)).not.toThrow()
    })
  }

  it('v2 no pide a la IA ninguna métrica global del reporte', () => {
    const keys = schemaKeys(buildCompetitivePromptV2(FIXTURE_PROJECT, FIXTURE_DATE_INFO))
    for (const f of GLOBAL_METRIC_FIELDS) expect(keys.has(f), f).toBe(false)
  })

  it('v2 conserva todas las claves del esquema de v1 y agrega las justificaciones', () => {
    const v1 = schemaKeys(buildCompetitivePromptV1(FIXTURE_PROJECT, FIXTURE_DATE_INFO))
    const v2 = schemaKeys(buildCompetitivePromptV2(FIXTURE_PROJECT, FIXTURE_DATE_INFO))
    for (const k of v1) expect(v2.has(k), k).toBe(true)
    for (const k of ['threatBasis', 'levelBasis', 'scoreBasis', 'probabilityBasis', 'impactBasis', 'evidenceBasis']) {
      expect(v2.has(k), k).toBe(true)
    }
  })

  it('v2 explica las rúbricas, la calibración y que los tamaños de lista son máximos', () => {
    const p = buildCompetitivePromptV2(FIXTURE_PROJECT, FIXTURE_DATE_INFO)
    for (const s of ['RÚBRICA DE AMENAZA', 'RÚBRICA DE NIVEL DE CAMBIO', 'RÚBRICA DE OPORTUNIDAD',
      'RÚBRICA DE PROBABILIDAD', 'RÚBRICA DE IMPACTO', 'REGLAS DE CALIBRACIÓN', 'MÁXIMOS, NO METAS', 'E0 —']) {
      expect(p).toContain(s)
    }
    // Los marcadores numéricos del esquema no anclan valores de ejemplo.
    const schema = p.slice(p.indexOf('ESTRUCTURA DE RESPUESTA JSON'))
    expect(schema).not.toMatch(/"(threat|score|probability|impact|overall)":\s*\d/)
    expect(schema).not.toMatch(/\+\d+%/)
  })

  it('el selector usa v3 por defecto y respeta REPORT_PROMPT_VERSION', () => {
    expect(ACTIVE_PROMPT_VERSION).toBe('v3')
    expect(resolvePromptVersion(undefined)).toBe('v3')
    expect(resolvePromptVersion('v2')).toBe('v2')
    expect(resolvePromptVersion('v1')).toBe('v1')
    expect(resolvePromptVersion(' V1 ')).toBe('v1')
    expect(resolvePromptVersion('otra')).toBe(ACTIVE_PROMPT_VERSION)
    expect(buildCompetitivePrompt(FIXTURE_PROJECT, FIXTURE_DATE_INFO, 'v1')).toBe(buildCompetitivePromptV1(FIXTURE_PROJECT, FIXTURE_DATE_INFO))
    expect(buildCompetitivePrompt(FIXTURE_PROJECT, FIXTURE_DATE_INFO, 'v2')).toContain('FASE 4 — EVALUACIÓN BASADA EN EVIDENCIA')
  })
})
