import { describe, it, expect, vi } from 'vitest'

vi.mock('./prisma', () => ({ prisma: {} }))
vi.mock('./config', () => ({ getSecret: () => undefined }))
vi.mock('./anthropic', () => ({ getAnthropic: () => ({}) }))

import { buildReportData } from './reportEngine'
import { toneForPressure, toneForOpportunity, toneForRisk } from './reportPalette'
import { FIXTURE_PROJECT, FIXTURE_DATE_INFO, FIXTURES, FixtureName, fixtureProject } from './reportFixtures'
import { buildViewModel, ringDash, TOTAL_PAGES } from './reportViewModel'

const vm = (name: FixtureName, skin: 'editorial' | 'panel' = 'editorial', teaser = false) => {
  const data = buildReportData(fixtureProject(name), FIXTURES[name], FIXTURE_DATE_INFO, 3, teaser)
  return buildViewModel(data, FIXTURES[name], skin)
}
const vmWith = (ai: any) => buildViewModel(buildReportData(FIXTURE_PROJECT, ai, FIXTURE_DATE_INFO, 3, false), ai, 'panel')

describe('ringDash', () => {
  it('escala el valor a la circunferencia y lo acota', () => {
    expect(ringDash(50, 289)).toBe(145)
    expect(ringDash(150, 289)).toBe(289)
    expect(ringDash(-5, 289)).toBe(0)
    expect(ringDash('x', 289)).toBe(0)
  })
})

describe('buildViewModel', () => {
  it('agrega clase de piel, conserva la de teaser y el total de páginas', () => {
    expect(vm('normal', 'panel').bodyClass).toBe('skin-panel')
    expect(vm('normal', 'editorial', true).bodyClass).toBe('is-teaser skin-editorial')
    expect(vm('normal').totalPages).toBe(TOTAL_PAGES)
    expect(TOTAL_PAGES).toBe(11)
  })
})

describe('buildViewModel (tonos y listas)', () => {
  it('tonos principales con la fixture normal', () => {
    const v = vm('normal')
    // Los scores ya no vienen fijos en la fixture: se calculan con reportScoring a partir de la evidencia.
    expect(v.pressureTone).toBe(toneForPressure(v.competitivePressure))
    expect(v.opportunityTone).toBe(toneForOpportunity(v.opportunityScore))
    expect(v.riskTone).toBe(toneForRisk(v.marketRisk))
    expect(v.pressureLgDash).toBe(ringDash(v.competitivePressure, 440))
    expect(v.riskDash).toBe(ringDash(v.marketRisk, 289))
    expect(v.mainAlertTone).toBe('bad')        // ALTO
  })

  it('etiqueta cada lista con tonos', () => {
    const v = vm('normal')
    expect(v.insights.map((i: any) => i.tone)).toEqual(['bad', 'ok', 'info'])
    expect(v.actions.map((a: any) => a.tone)).toEqual(['bad', 'warn', 'info'])
    expect(v.competitors[0]).toMatchObject({ threatTone: 'bad', riskTone: 'bad', growthTone: 'ok' })
    expect(v.competitors[3]).toMatchObject({ threatTone: 'ok', riskTone: 'ok', growthTone: 'bad' })
    expect(v.changesCol1[0].tone).toBe('bad')      // PRECIO
    expect(v.priceTrends[0].tone).toBe('bad')      // ↓
    expect(v.highRisks.map((r: any) => r.tone)).toEqual(['bad', 'warn', 'ok'])
    expect(v.opportunities[0].tone).toBe('ok')     // 86
    expect(v.opportunities[3].tone).toBe('info')   // 58
  })

  it('ventajas del rival: la propia sale en ok, las del rival en bad', () => {
    const v = vm('normal')
    expect(v.rivalAdvantages.map((r: any) => r.tone)).toEqual(['bad', 'bad', 'ok'])
  })

  it('página 6: calendario semanal igual que v1 (señales de la IA, máximo 4; sin datos, respaldo con competidores)', () => {
    const v = vm('normal')
    expect(v.weekPlan1).toEqual(FIXTURES.normal.criticalSignals.slice(0, 4))
    const m = vm('minimal')
    expect(m.weekPlan1).toHaveLength(4)
    expect(m.weekPlan3).toEqual(['Monitorear nuevo jugador en sector', 'Actualizar materiales comerciales', 'Revisión de equipo y talento', 'Análisis SEO y keywords'])
  })

  it('benchmark: filas estructuradas', () => {
    const v = vm('normal')
    expect(v.benchmarkRows).toHaveLength(6)
    expect(v.benchmarkRows[0]).toMatchObject({ factor: 'Precio / Tarifas', client: 'MEDIO', clientCls: 'is-client', c1: 'BAJO', position: '2do lugar', positionTone: 'warn' })
    expect(v.benchmarkRows[1].positionTone).toBe('ok')
    expect(v.benchmarkRows[2].positionTone).toBe('neutral')
  })

  it('benchmark vacío usa los factores por defecto con N/A', () => {
    const v = vm('minimal')
    expect(v.benchmarkRows).toHaveLength(8)
    expect(v.benchmarkRows[0]).toMatchObject({ factor: 'Precio', client: 'N/A', clientCls: 'is-na', c1: 'N/A', position: '—', positionTone: 'neutral' })
  })

  it('con la fixture mínima todas las listas existen', () => {
    const v = vm('minimal')
    for (const k of ['insights', 'actions', 'competitors', 'criticalAlerts', 'mediumAlerts', 'changesCol1', 'changesCol2', 'opportunities', 'highRisks', 'mediumRisks', 'highPriorityRecs', 'mediumPriorityRecs', 'lowPriorityRecs', 'secondaryCompetitors', 'targetSegments']) {
      expect(Array.isArray(v[k]), k).toBe(true)
    }
  })

  it('no muta los datos de entrada', () => {
    const data = buildReportData(FIXTURE_PROJECT, FIXTURES.normal, FIXTURE_DATE_INFO, 3, false)
    const before = JSON.stringify(data)
    buildViewModel(data, FIXTURES.normal, 'panel')
    expect(JSON.stringify(data)).toBe(before)
  })
})

describe('buildViewModel (benchmark: posición y columnas)', () => {
  it('separa la posición en rango y nota (normal: sin nota)', () => {
    const r = vm('normal').benchmarkRows[0]
    expect(r).toMatchObject({ position: '2do lugar', positionRank: '2do lugar', positionNote: '', positionTone: 'warn' })
  })

  it('separa en el primer « — », « – », « - » o «:» y calcula el tono sobre el rango', () => {
    const rows = [
      { factor: 'A', client: 'x', position: '2do lugar — precio competitivo entre premium 1er nivel y básico local' },
      { factor: 'B', client: 'x', position: '1er lugar – ventaja clara' },
      { factor: 'C', client: 'x', position: '4to lugar - detrás de 1 rival y 2 líderes' },
      { factor: 'D', client: 'x', position: 'Empate: 1 de 3 iguales' },
      { factor: 'E', client: 'x', position: '3er lugar' },
    ]
    const v = vmWith({ ...FIXTURES.normal, benchmarkRows: rows })
    expect(v.benchmarkRows.map((r: any) => [r.positionRank, r.positionNote, r.positionTone])).toEqual([
      ['2do lugar', 'precio competitivo entre premium 1er nivel y básico local', 'warn'],
      ['1er lugar', 'ventaja clara', 'ok'],
      ['4to lugar', 'detrás de 1 rival y 2 líderes', 'neutral'],
      ['Empate', '1 de 3 iguales', 'neutral'],
      ['3er lugar', '', 'neutral'],
    ])
  })

  it('fixture real: la nota entre paréntesis se separa del rango y el tono no se confunde con números de la nota', () => {
    const rows = vm('real').benchmarkRows
    expect(rows).toHaveLength(9)
    expect(rows[0]).toMatchObject({ positionRank: '3er lugar', positionNote: 'competitivo', positionTone: 'neutral' })
    expect(rows[1]).toMatchObject({ positionRank: '2do lugar', positionNote: 'variedad acabados', positionTone: 'warn' })
    expect(rows[2]).toMatchObject({ positionRank: '4to lugar', positionNote: '', positionTone: 'neutral' })
    expect(rows[7]).toMatchObject({ positionRank: '1er lugar', positionNote: 'nicho dual único', positionTone: 'ok' })
    expect(rows[0].position).toBe('3er lugar (competitivo)')
  })

  it('encabezados del benchmark: los 5 competidores del motor, como en v1 (sin ocultar columnas)', () => {
    const real = vm('real')
    expect(real.benchmarkCompetitors.map((c: any) => c.name)).toEqual(['Sticker Mule', 'Creatify', 'Stickeria', 'Pegalinas.com', 'Pop México'])
    expect(vm('minimal').benchmarkCompetitors).toHaveLength(5)
    expect(vm('normal')).not.toHaveProperty('benchColsClass')
  })

  it('no muta los datos de entrada (real)', () => {
    const ai = FIXTURES.real
    const data = buildReportData(fixtureProject('real'), ai, FIXTURE_DATE_INFO, 1, false)
    const before = JSON.stringify(data)
    const aiBefore = JSON.stringify(ai)
    buildViewModel(data, ai, 'editorial')
    expect(JSON.stringify(data)).toBe(before)
    expect(JSON.stringify(ai)).toBe(aiBefore)
  })
})

describe('buildViewModel (fix 1)', () => {
  it('la coma también separa rango y nota sin romper los demás casos', () => {
    const rows = [
      { factor: 'A', client: 'x', position: '2do lugar, empatado con Sticker Mule' },
      { factor: 'B', client: 'x', position: '1er lugar (empate con A, B)' },
      { factor: 'C', client: 'x', position: 'Empate técnico con Sticker Mule' },
    ]
    const v = vmWith({ ...FIXTURES.normal, benchmarkRows: rows })
    expect(v.benchmarkRows.map((r: any) => [r.positionRank, r.positionNote, r.positionTone])).toEqual([
      ['2do lugar', 'empatado con Sticker Mule', 'warn'],
      ['1er lugar', 'empate con A, B', 'ok'],
      ['Empate técnico con Sticker Mule', '', 'neutral'],
    ])
  })

  it('topCompetitors: los mismos 4 que v1 (motor) con tono por amenaza', () => {
    const v = vm('real')
    expect(v.topCompetitors.map((c: any) => c.name)).toEqual(['Sticker Mule', 'Creatify', 'Stickeria', 'Pegalinas.com'])
    expect(v.topCompetitors[0]).toMatchObject({ initials: 'ST', threat: 9, tone: 'bad' })
  })
})

