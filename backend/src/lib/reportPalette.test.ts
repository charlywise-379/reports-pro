// backend/src/lib/reportPalette.test.ts
import { describe, it, expect } from 'vitest'
import {
  norm, toneForPressure, toneForOpportunity, toneForRisk, toneForThreat, toneForProbability,
  toneForLevel, toneForDelta, toneForPriority, priorityLabel, toneForEffort, effortLabel,
  toneForChangeCategory, toneForInsightCategory,
} from './reportPalette'

describe('norm', () => {
  it('quita acentos, recorta y pasa a mayúsculas', () => {
    expect(norm(' Crítico ')).toBe('CRITICO')
    expect(norm(undefined)).toBe('')
  })
})

describe('umbrales numéricos', () => {
  it('presión', () => {
    expect(toneForPressure(80)).toBe('bad')
    expect(toneForPressure(60)).toBe('warn')
    expect(toneForPressure(50)).toBe('ok')
  })
  it('oportunidad', () => {
    expect(toneForOpportunity(70)).toBe('ok')
    expect(toneForOpportunity(45)).toBe('info')
    expect(toneForOpportunity(10)).toBe('warn')
  })
  it('riesgo, amenaza y probabilidad', () => {
    expect(toneForRisk(61)).toBe('bad')
    expect(toneForRisk(40)).toBe('warn')
    expect(toneForRisk(35)).toBe('ok')
    expect(toneForThreat(8)).toBe('bad')
    expect(toneForThreat(5)).toBe('warn')
    expect(toneForThreat(2)).toBe('ok')
    expect(toneForProbability(70)).toBe('bad')
    expect(toneForProbability(40)).toBe('warn')
    expect(toneForProbability(10)).toBe('ok')
  })
})

describe('niveles y textos de la IA', () => {
  it('toneForLevel acepta acentos', () => {
    expect(toneForLevel('CRÍTICO')).toBe('bad')
    expect(toneForLevel('ALTO')).toBe('bad')
    expect(toneForLevel('VIGILAR')).toBe('warn')
    expect(toneForLevel('MEDIO')).toBe('warn')
    expect(toneForLevel('BAJO')).toBe('ok')
    expect(toneForLevel('???')).toBe('neutral')
  })
  it('toneForDelta usa las flechas', () => {
    expect(toneForDelta('↑ subió +12% Esta semana')).toBe('ok')
    expect(toneForDelta('↓ bajó -5%')).toBe('bad')
    expect(toneForDelta('→ Estable')).toBe('neutral')
    expect(toneForDelta(undefined)).toBe('neutral')
  })
  it('prioridad: ALTA/MED/BAJA y variantes', () => {
    expect(toneForPriority('ALTA')).toBe('bad')
    expect(toneForPriority('HIGH')).toBe('bad')
    expect(toneForPriority('MED')).toBe('warn')
    expect(toneForPriority('BAJA')).toBe('info')
    expect(priorityLabel('MED')).toBe('MEDIA')
    expect(priorityLabel('ALTA')).toBe('ALTA')
    expect(priorityLabel('urgente')).toBe('URGENTE')
  })
})

describe('esfuerzo (dificultad, tiempo, costo)', () => {
  it('acepta acentos y sufijos entre paréntesis', () => {
    expect(toneForEffort('FÁCIL')).toBe('ok')
    expect(toneForEffort('DIFÍCIL')).toBe('bad')
    expect(toneForEffort('CORTO (1-3 días)')).toBe('ok')
    expect(toneForEffort('MEDIO (1-2 semanas)')).toBe('warn')
    expect(toneForEffort('LARGO (1+ mes)')).toBe('bad')
    expect(toneForEffort('BAJO (menos $5,000 MXN)')).toBe('ok')
    expect(toneForEffort('ALTO (más $20,000)')).toBe('bad')
    expect(toneForEffort(undefined)).toBe('neutral')
  })
  it('etiquetas en español', () => {
    expect(effortLabel('difficulty', 'FÁCIL')).toBe('Fácil de implementar')
    expect(effortLabel('difficulty', 'DIFÍCIL')).toBe('Complejo de implementar')
    expect(effortLabel('time', 'CORTO')).toBe('Tiempo corto')
    expect(effortLabel('time', 'LARGO')).toBe('Tiempo largo')
    expect(effortLabel('cost', 'BAJO')).toBe('Bajo costo')
    expect(effortLabel('cost', 'ALTO')).toBe('Alta inversión')
    expect(effortLabel('cost', undefined)).toBe('Costo sin definir')
  })
})

describe('categorías', () => {
  it('cambios: usa el texto antes de «·»', () => {
    expect(toneForChangeCategory('PRECIO · ALTO')).toBe('bad')
    expect(toneForChangeCategory('EXPANSIÓN · MEDIO')).toBe('info')
    expect(toneForChangeCategory('PRODUCTO')).toBe('ok')
    expect(toneForChangeCategory('TALENTO · BAJO')).toBe('warn')
    expect(toneForChangeCategory('OTRA COSA')).toBe('neutral')
  })
  it('insights: usa el nivel después de «·» y la palabra OPORTUNIDAD', () => {
    expect(toneForInsightCategory('PRECIO · CRÍTICO')).toBe('bad')
    expect(toneForInsightCategory('MERCADO · ALTO')).toBe('bad')
    expect(toneForInsightCategory('ANÁLISIS · MEDIO')).toBe('warn')
    expect(toneForInsightCategory('OPORTUNIDAD · ALTA')).toBe('ok')
    expect(toneForInsightCategory('ANÁLISIS · INFO')).toBe('info')
    expect(toneForInsightCategory(undefined)).toBe('info')
  })
})
