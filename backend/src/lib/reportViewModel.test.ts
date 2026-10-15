import { describe, it, expect, vi } from 'vitest'

vi.mock('./prisma', () => ({ prisma: {} }))
vi.mock('./config', () => ({ getSecret: () => undefined }))
vi.mock('./anthropic', () => ({ getAnthropic: () => ({}) }))

import { buildReportData } from './reportEngine'
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
    expect(v.pressureTone).toBe('warn')        // 72 > 50
    expect(v.opportunityTone).toBe('info')     // 68 >= 45
    expect(v.riskTone).toBe('warn')            // 44 > 35
    expect(v.pressureLgDash).toBe(ringDash(72, 440))
    expect(v.riskDash).toBe(ringDash(44, 289))
    expect(v.mainAlertTone).toBe('bad')        // ALTO
  })

  it('etiqueta cada lista con tonos', () => {
    const v = vm('normal')
    expect(v.insights.map((i: any) => i.tone)).toEqual(['bad', 'ok', 'info'])
    expect(v.actions.map((a: any) => a.tone)).toEqual(['bad', 'warn', 'info'])
    expect(v.actions[1].priorityLabel).toBe('MEDIA')
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

  it('recomendaciones: esfuerzo con acentos y etiquetas', () => {
    const v = vm('normal')
    expect(v.highPriorityRecs[0]).toMatchObject({ difficultyTone: 'ok', difficultyLabel: 'Fácil de implementar', timeTone: 'ok', costTone: 'ok' })
    expect(v.highPriorityRecs[1]).toMatchObject({ difficultyTone: 'warn', timeTone: 'warn', costTone: 'warn' })
    expect(v.mediumPriorityRecs[1]).toMatchObject({ difficultyTone: 'bad', difficultyLabel: 'Complejo de implementar', costLabel: 'Alta inversión' })
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

  it('columnas usadas: cols-5 con cinco competidores con datos (normal y real)', () => {
    expect(vm('normal').benchColsClass).toBe('cols-5')
    const real = vm('real')
    expect(real.benchColsClass).toBe('cols-5')
    expect(real.benchmarkCompetitors.map((c: any) => c.name)).toEqual(['Sticker Mule', 'Creatify', 'Stickeria', 'Pegalinas.com', 'Pop México'])
  })

  it('omite columnas finales vacías (N/A en todas las filas) y les pone «—»', () => {
    const rows = FIXTURES.normal.benchmarkRows.map((r: any) => ({ ...r, comp4: 'N/A', comp5: '' }))
    const v = vmWith({ ...FIXTURES.normal, benchmarkRows: rows })
    expect(v.benchColsClass).toBe('cols-3')
    expect(v.benchmarkCompetitors.map((c: any) => c.name)).toEqual(['Atlas Creativo', 'Norte Digital', 'Pixel & Co', '—', '—'])
  })

  it('un hueco interno no reduce las columnas: n es la última columna con datos', () => {
    const rows = FIXTURES.normal.benchmarkRows.map((r: any) => ({ ...r, comp2: 'N/A', comp5: 'N/A' }))
    const v = vmWith({ ...FIXTURES.normal, benchmarkRows: rows })
    expect(v.benchColsClass).toBe('cols-4')
    expect(v.benchmarkCompetitors[1].name).toBe('—')
    expect(v.benchmarkCompetitors[3].name).toBe('Marea Studio')
  })

  it('columna con datos sin competidor registrado en esa posición: «Otros»', () => {
    const ai = { ...FIXTURES.normal, competitors: FIXTURES.normal.competitors.slice(0, 3) }
    const v = vmWith(ai)
    expect(v.benchColsClass).toBe('cols-5')
    expect(v.benchmarkCompetitors.map((c: any) => c.name)).toEqual(['Atlas Creativo', 'Norte Digital', 'Pixel & Co', 'Otros', 'Otros'])
  })

  it('sin benchmark (minimal): una columna como mínimo y encabezados «—»', () => {
    const v = vm('minimal')
    expect(v.benchColsClass).toBe('cols-1')
    expect(v.benchmarkCompetitors.map((c: any) => c.name)).toEqual(['—', '—', '—', '—', '—'])
    expect(v.benchmarkRows[0]).toMatchObject({ positionRank: '—', positionNote: '' })
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
