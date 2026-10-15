import { describe, it, expect, vi } from 'vitest'

vi.mock('./prisma', () => ({ prisma: {} }))
vi.mock('./config', () => ({ getSecret: () => undefined }))
vi.mock('./anthropic', () => ({ getAnthropic: () => ({}) }))

import { buildReportData } from './reportEngine'
import { FIXTURE_PROJECT, FIXTURE_DATE_INFO, FIXTURES } from './reportFixtures'
import { buildViewModel, ringDash, TOTAL_PAGES } from './reportViewModel'

const vm = (name: 'normal' | 'extreme' | 'minimal', skin: 'editorial' | 'panel' = 'editorial', teaser = false) => {
  const data = buildReportData(FIXTURE_PROJECT, FIXTURES[name], FIXTURE_DATE_INFO, 3, teaser)
  return buildViewModel(data, FIXTURES[name], skin)
}

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
