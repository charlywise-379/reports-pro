import { describe, it, expect, vi } from 'vitest'

vi.mock('./prisma', () => ({ prisma: {} }))
vi.mock('./config', () => ({ getSecret: () => undefined }))
vi.mock('./anthropic', () => ({ getAnthropic: () => ({}) }))

import { buildReportData } from './reportEngine'
import { FIXTURE_PROJECT, FIXTURE_DATE_INFO, FIXTURES } from './reportFixtures'

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
    expect(d.criticalAlerts[0].description.length).toBeGreaterThan(300)
    expect(d.changesCol1.length).toBe(6)
    expect(d.secondaryCompetitors.length).toBe(8)
  })
})
