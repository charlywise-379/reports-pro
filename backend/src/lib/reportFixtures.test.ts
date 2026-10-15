import { describe, it, expect, vi } from 'vitest'

vi.mock('./prisma', () => ({ prisma: {} }))
vi.mock('./config', () => ({ getSecret: () => undefined }))
vi.mock('./anthropic', () => ({ getAnthropic: () => ({}) }))

import { buildReportData } from './reportEngine'
import { FIXTURE_PROJECT, FIXTURE_PROJECT_REAL, FIXTURE_DATE_INFO, FIXTURES, aiNormal, makeExtreme } from './reportFixtures'

describe('fixtures del reporte', () => {
  for (const name of ['normal', 'extreme', 'minimal'] as const) {
    it(`buildReportData acepta la fixture ${name}`, () => {
      const data = buildReportData(FIXTURE_PROJECT, FIXTURES[name], FIXTURE_DATE_INFO, 3, false)
      expect(data.companyName).toBe('Estudio Boreal')
      expect(Array.isArray(data.competitors)).toBe(true)
      expect(data.edition).toBe(3)
    })
  }
  it('la fixture normal trae contenido en cada sección', () => {
    const d = buildReportData(FIXTURE_PROJECT, FIXTURES.normal, FIXTURE_DATE_INFO, 3, false)
    expect(d.criticalAlerts.length).toBeGreaterThan(0)
    expect(d.mediumAlerts.length).toBeGreaterThan(0)
    expect(d.changesCol1.length).toBeGreaterThan(0)
    expect(d.opportunities.length).toBe(4)
    expect(d.highRisks.length).toBe(3)
    expect(d.highPriorityRecs.length).toBeGreaterThan(0)
  })
  it('la fixture extrema usa textos largos y máximos', () => {
    const d = buildReportData(FIXTURE_PROJECT, FIXTURES.extreme, FIXTURE_DATE_INFO, 3, false)
    expect(d.criticalAlerts[0].description.length).toBeGreaterThan(200)
    expect(d.changesCol1.length).toBe(6)
    expect(d.secondaryCompetitors.length).toBe(8)
  })
  it('la fixture extrema está en los máximos reales de cada lista del prompt', () => {
    const e = FIXTURES.extreme as any
    expect(e.benchmarkRows).toHaveLength(9)
    expect(e.criticalAlerts).toHaveLength(3)
    expect(e.mediumAlerts).toHaveLength(4)
    expect(e.changesCol1).toHaveLength(6)
    expect(e.changesCol2).toHaveLength(6)
    expect(e.secondaryCompetitors).toHaveLength(8)
    expect(e.highPriorityRecs).toHaveLength(2)
    expect(e.mediumPriorityRecs).toHaveLength(2)
    expect(e.lowPriorityRecs).toHaveLength(2)
  })
  it('la fixture extrema es realista: las cadenas largas crecen entre 100 y 150 caracteres, nunca más', () => {
    const e = makeExtreme(aiNormal)
    const pairs: Array<[string, string]> = []
    const walk = (a: any, b: any) => {
      if (typeof a === 'string' && typeof b === 'string') { pairs.push([a, b]); return }
      if (Array.isArray(a) && Array.isArray(b)) { a.forEach((x, i) => walk(x, b[i])); return }
      if (a && b && typeof a === 'object') for (const k of Object.keys(a)) if (k !== 'icon') walk(a[k], b[k])
    }
    // Compara solo las listas que no se reordenan al crecer (las primeras posiciones son las originales).
    for (const k of ['insights', 'actions', 'criticalAlerts', 'mediumAlerts', 'changesCol1', 'highRisks', 'opportunities', 'benchmarkRows', 'mainAlertDesc', 'marketStatusDesc']) walk(aiNormal[k], e[k])
    const long = pairs.filter(([a]) => a.length > 40)
    expect(long.length).toBeGreaterThan(20)
    for (const [a, b] of long) {
      expect(b.length - a.length, a).toBeGreaterThanOrEqual(100)
      expect(b.length - a.length, a).toBeLessThanOrEqual(150)
      expect(b.startsWith(a), a).toBe(true)
    }
    for (const [a, b] of pairs) expect(b.length - a.length, a).toBeLessThanOrEqual(150)
  })
  it('la fixture real (Stick-A-Boom) se carga bajo demanda y trae el análisis completo', () => {
    const desc = Object.getOwnPropertyDescriptor(FIXTURES, 'real')
    expect(typeof desc?.get).toBe('function')
    const r = FIXTURES.real as any
    expect(r.competitors).toHaveLength(5)
    expect(r.benchmarkRows).toHaveLength(9)
    expect(r.secondaryCompetitors.length).toBeGreaterThanOrEqual(7)
    expect(FIXTURES.real).toBe(r)
    const d = buildReportData(FIXTURE_PROJECT_REAL, r, FIXTURE_DATE_INFO, 1, false)
    expect(d.companyName).toBe('Stick-A-Boom')
    expect(d.benchmarkCompetitors.map((c: any) => c.name)).toEqual(r.competitors.map((c: any) => c.name))
  })
  it('la fixture extrema ejerce los máximos reales de benchmark y recomendaciones', () => {
    expect((FIXTURES.extreme as any).benchmarkRows.length).toBe(9)
    const d = buildReportData(FIXTURE_PROJECT, FIXTURES.extreme, FIXTURE_DATE_INFO, 3, false)
    expect(d.highPriorityRecs.length).toBe(2)
    expect(d.mediumPriorityRecs.length).toBe(2)
    expect(d.lowPriorityRecs.length).toBe(2)
  })
})
