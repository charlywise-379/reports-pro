import { describe, it, expect } from 'vitest'
import { enforceRubrics, threatFromFactors, riskLabelFor, opportunityFromFactors, normalizePresenceLevel } from './reportEnforcement'
import { computeScores } from './reportScoring'

const comp = (name: string, f: any, extra: any = {}) => ({ name, threat: 9, riskLabel: 'CRÍTICO', threatFactors: f, recentMove: `${name} movió algo`, ...extra })

describe('reportEnforcement — sumas de rúbrica', () => {
  it('amenaza = 1 + factores, con topes por factor y máximo 10', () => {
    expect(threatFromFactors({ overlap: 3, move: 2, strength: 2, digital: 1 })).toBe(9)
    expect(threatFromFactors({ overlap: 9, move: 9, strength: 9, digital: 9 })).toBe(10)
    expect(threatFromFactors({ overlap: 2 })).toBe(3)
    expect(threatFromFactors({ overlap: '3', move: 'alto' })).toBe(4)
  })

  it('CRÍTICO solo con 9-10 y movimiento E3 de esta semana', () => {
    expect(riskLabelFor(9, 3)).toBe('CRÍTICO')
    expect(riskLabelFor(9, 2)).toBe('VIGILAR')
    expect(riskLabelFor(7, 3)).toBe('VIGILAR')
    expect(riskLabelFor(5, 0)).toBe('MEDIO')
    expect(riskLabelFor(4, 3)).toBe('BAJO')
  })

  it('reemplaza el total y la etiqueta declarados y deja registro (sin "+1 por marca")', () => {
    // Caso real Almex C: Traxión a2+b1+c2+d1 = 6 → la IA escribió 7.
    const { aiData, audit } = enforceRubrics({
      competitors: [comp('Grupo Traxión', { overlap: 2, move: 1, strength: 2, digital: 1 }, { threat: 7, riskLabel: 'VIGILAR' })],
    })
    expect(aiData.competitors[0].threat).toBe(7) // 1 + 2 + 1 + 2 + 1
    expect(aiData.competitors[0].riskLabel).toBe('VIGILAR')
    const { aiData: b, audit: a2 } = enforceRubrics({
      competitors: [comp('Pitic', { overlap: 2, move: 0, strength: 0, digital: 0 }, { threat: 4, riskLabel: 'BAJO' })],
    })
    expect(b.competitors[0].threat).toBe(3)
    expect(a2.threatsAdjusted).toEqual([{ name: 'Pitic', declared: 4, computed: 3 }])
    expect(audit.threatsFromFactors).toBe(1)
  })

  it('sin factores (prompt v1) conserva la amenaza declarada', () => {
    const { aiData, audit } = enforceRubrics({ competitors: [{ name: 'X', threat: 6, riskLabel: 'MEDIO' }] })
    expect(aiData.competitors[0].threat).toBe(6)
    expect(audit.threatsFromFactors).toBe(0)
  })

  it('oportunidad = suma de componentes; sin demanda E3 el máximo es 84', () => {
    expect(opportunityFromFactors({ demand: 40, feasibility: 30, gap: 20, window: 10 })).toBe(100)
    expect(opportunityFromFactors({ demand: 25, feasibility: 30, gap: 20, window: 10 })).toBe(84)
    expect(opportunityFromFactors({ demand: 25, feasibility: 20, gap: 10, window: 0 })).toBe(55)
    const { aiData, audit } = enforceRubrics({ opportunities: [{ title: 'O', score: 65, scoreFactors: { demand: 25, feasibility: 20, gap: 10, window: 0 } }] })
    expect(aiData.opportunities[0].score).toBe(55) // la IA había escrito "=55 +10"
    expect(audit.opportunitiesAdjusted).toHaveLength(1)
  })
})

describe('reportEnforcement — coherencia de alertas', () => {
  const base = () => ({
    competitors: [
      comp('Tresguerras', { overlap: 3, move: 3, strength: 2, digital: 1 }),
      comp('Castores', { overlap: 3, move: 2, strength: 2, digital: 1 }, { threat: 8 }),
    ],
    changesCol1: [
      { category: 'DIGITAL · CRÍTICO', title: 'Tresguerras domina posición orgánica en Google', competitor: 'Tresguerras', description: 'd', date: '5 nov' },
      { category: 'PRECIOS · ALTO', title: 'Castores incrementa tarifas LTL 6%', competitor: 'Castores', description: 'd', date: '1 nov' },
    ],
    changesCol2: [{ category: 'MERCADO · CRÍTICO', title: 'Diésel alcanza máximo del año en Monterrey', competitor: 'Mercado general', description: 'd' }],
    criticalAlerts: [
      { title: 'Castores sube tarifas LTL 6% — ventana para captar clientes', level: 'ALTA', description: 'x' },
      { title: 'Tresguerras domina SEO local — Almex invisible', level: 'ALTA', description: 'x' },
    ],
    mediumAlerts: [{ title: 'Diésel en máximo del año — presión en márgenes' }],
    mainAlertLevel: 'ALTO',
  })

  it('cambio o competidor CRÍTICO → alerta CRÍTICA (sube la existente o crea una)', () => {
    const { aiData, audit } = enforceRubrics(base())
    const tg = aiData.criticalAlerts.find((a: any) => a.title.startsWith('Tresguerras'))
    expect(tg.level).toBe('CRÍTICA')
    expect(audit.alertsUpgraded.map(u => u.title)).toContain('Tresguerras domina SEO local — Almex invisible')
    // El diésel no tenía alerta urgente: se crea CRÍTICA desde el cambio.
    expect(aiData.criticalAlerts.some((a: any) => a.title.startsWith('Diésel alcanza') && a.level === 'CRÍTICA' && a.generatedBy === 'sistema')).toBe(true)
    // CRÍTICAS primero, máximo 3; Castores (ALTA) queda al final.
    expect(aiData.criticalAlerts.map((a: any) => a.level)).toEqual(['CRÍTICA', 'CRÍTICA', 'ALTA'])
    expect(aiData.mainAlertLevel).toBe('CRÍTICO')
  })

  it('cambio ALTO de competidor directo sin alerta → se crea ALTA', () => {
    const d = base()
    d.criticalAlerts = d.criticalAlerts.filter(a => !a.title.startsWith('Castores'))
    const { audit } = enforceRubrics(d)
    expect(audit.alertsCreated.some(c => c.title.startsWith('Castores') && c.level === 'ALTA')).toBe(true)
  })

  it('no toca alertas cuando ya son coherentes', () => {
    const { audit } = enforceRubrics({
      competitors: [comp('A', { overlap: 3, move: 1, strength: 1, digital: 0 })],
      changesCol1: [{ category: 'PRECIO · MEDIO', title: 'algo menor', competitor: 'A' }],
      criticalAlerts: [], mediumAlerts: [],
    })
    expect(audit.alertsCreated).toEqual([])
    expect(audit.alertsUpgraded).toEqual([])
  })
})

describe('reportEnforcement — riesgos y listas', () => {
  it('las debilidades propias salen del riesgo de mercado y pasan a áreas de mejora', () => {
    const raw = {
      highRisks: [
        { title: 'Pérdida de leads por invisibilidad en Google', probability: 85, impact: 7, origin: 'PROPIO' },
        { title: 'Compresión de márgenes por diésel', probability: 75, impact: 8, origin: 'EXTERNO' },
      ],
      improvements: ['a', 'b', 'c', 'd', 'e'],
    }
    const { aiData, audit } = enforceRubrics(raw)
    expect(aiData.highRisks.map((r: any) => r.title)).toEqual(['Compresión de márgenes por diésel'])
    expect(aiData.improvements[0]).toBe('CRÍTICO · Pérdida de leads por invisibilidad en Google')
    expect(aiData.improvements).toHaveLength(5)
    expect(audit.ownRisksMoved).toHaveLength(1)
    // Área de oportunidad con impacto en presencia digital → alerta CRÍTICA (con su mitigación como acción).
    expect(aiData.criticalAlerts).toEqual([expect.objectContaining({ title: 'Pérdida de leads por invisibilidad en Google', level: 'CRÍTICA' })])
    expect(computeScores({ highRisks: aiData.highRisks }).marketRisk).toBeLessThan(computeScores({ highRisks: raw.highRisks }).marketRisk)
  })

  it('un área propia ya alertada como ALTA sube a CRÍTICA; una menor sin impacto digital no', () => {
    const { aiData } = enforceRubrics({
      highRisks: [
        { title: 'Ausencia en búsquedas orgánicas de Google', impact: 7, origin: 'PROPIO' },
        { title: 'Proceso interno de facturación lento', impact: 3, origin: 'PROPIO' },
      ],
      criticalAlerts: [{ title: 'Marca ausente en búsquedas orgánicas clave de Google México', level: 'ALTA' }],
    })
    expect(aiData.criticalAlerts.map((a: any) => a.level)).toEqual(['CRÍTICA'])
    expect(aiData.improvements).toEqual(['CRÍTICO · Ausencia en búsquedas orgánicas de Google', 'Proceso interno de facturación lento'])
  })

  it('aplica los máximos de lista del sistema', () => {
    const many = (n: number) => Array.from({ length: n }, (_, i) => ({ title: `t${i}` }))
    const { aiData } = enforceRubrics({ mediumAlerts: many(9), rivalWeaknesses: many(9), mediumRisks: many(9), opportunities: many(9), changesCol1: many(9) })
    expect(aiData.mediumAlerts).toHaveLength(4)
    expect(aiData.rivalWeaknesses).toHaveLength(6)
    expect(aiData.mediumRisks).toHaveLength(4)
    expect(aiData.opportunities).toHaveLength(4)
    expect(aiData.changesCol1).toHaveLength(6)
  })

  it('la amenaza de la presión usa principales + secundarios (no depende de la clasificación de la IA)', () => {
    const principals = [{ name: 'A', threat: 9 }, { name: 'B', threat: 8 }, { name: 'C', threat: 7 }]
    const split3 = computeScores({ competitors: principals.slice(0, 1), threatPool: principals })
    const split1 = computeScores({ competitors: principals, threatPool: principals })
    expect(split3.components.threat).toBe(split1.components.threat)
  })

  it('no modifica el objeto original', () => {
    const raw = { competitors: [comp('A', { overlap: 1 })], criticalAlerts: [] as any[] }
    enforceRubrics(raw)
    expect(raw.competitors[0].threat).toBe(9)
    expect(raw.criticalAlerts).toEqual([])
  })
})

describe('reportEnforcement — topes por evidencia y origen', () => {
  it('movimiento del competidor limitado por la evidencia de threatBasis', () => {
    const { aiData, audit } = enforceRubrics({ competitors: [{ name: 'X', threatFactors: { overlap: 3, move: 3, strength: 2, digital: 1 }, threatBasis: 'E2 · anuncio sin fecha' }] })
    expect(aiData.competitors[0].threat).toBe(9) // move 3 → 2
    expect(aiData.competitors[0].riskLabel).toBe('VIGILAR') // 9 sin movimiento E3 no es CRÍTICO
    expect(audit.evidenceAdjustments[0]).toMatchObject({ from: 3, to: 2 })
  })

  it('oportunidad: demanda según evidencia y componentes en valores permitidos', () => {
    const { aiData } = enforceRubrics({ opportunities: [
      { title: 'A', scoreFactors: { demand: 40, feasibility: 30, gap: 10, window: 10 }, scoreBasis: 'E2 · demanda indirecta' },
      { title: 'B', scoreFactors: { demand: 25, feasibility: 25, gap: 15, window: 7 }, scoreBasis: 'E1 · sectorial' },
    ] })
    expect(aiData.opportunities.map((o: any) => o.score)).toEqual([75, 45]) // 25+30+10+10 · 10+20+10+5 (E1 → demanda 10; 25/15/7 → 20/10/5)
  })

  it('riesgos: E1 baja a riesgos medios; probabilidad 90+ exige E3', () => {
    const { aiData } = enforceRubrics({ highRisks: [
      { title: 'Tendencia', probability: 60, impact: 5, origin: 'EXTERNO', probabilityBasis: 'E1 · reportes de industria' },
      { title: 'Regulación', probability: 95, impact: 8, origin: 'EXTERNO', probabilityBasis: 'E2 · anunciada' },
    ], mediumRisks: [{ title: 'm1' }] })
    expect(aiData.highRisks.map((r: any) => [r.title, r.probability])).toEqual([['Regulación', 89]])
    expect(aiData.mediumRisks.map((r: any) => r.title)).toEqual(['Tendencia', 'm1'])
  })

  it('cambios: CRÍTICO exige E3, ALTO exige E2+, E0 se excluye', () => {
    const { aiData } = enforceRubrics({ changesCol1: [
      { title: 'a', category: 'PRECIO · CRÍTICO', levelBasis: 'E2 · x' },
      { title: 'b', category: 'MERCADO · ALTO', levelBasis: 'E1 · x' },
      { title: 'c', category: 'SEO · MEDIO', levelBasis: 'E0 · inferencia' },
    ] })
    expect(aiData.changesCol1.map((c: any) => c.category)).toEqual(['PRECIO · ALTO', 'MERCADO · MEDIO'])
  })

  it('alerta CRÍTICA/ALTA con evidencia E1 pasa a vigilancia', () => {
    const { aiData } = enforceRubrics({ criticalAlerts: [{ title: 'rumor', level: 'ALTA', evidenceBasis: 'E1 · tendencia' }], mediumAlerts: [] })
    expect(aiData.criticalAlerts).toEqual([])
    expect(aiData.mediumAlerts[0].title).toBe('rumor')
  })

  it('un riesgo "externo" que describe una carencia del cliente se corrige a propio', () => {
    const { aiData, audit } = enforceRubrics({ highRisks: [
      { title: 'Brecha tecnológica: clientes esperan seguimiento que Almex no ofrece', probability: 65, impact: 6, origin: 'EXTERNO', probabilityBasis: 'E3 · x' },
      { title: 'Castores baja tarifas 15%', description: 'Almex mantiene precios', probability: 75, impact: 7, origin: 'EXTERNO', probabilityBasis: 'E3 · x' },
    ] }, [], { companyName: 'Almex' })
    expect(audit.originsCorrected).toEqual(['Brecha tecnológica: clientes esperan seguimiento que Almex no ofrece'])
    expect(aiData.highRisks.map((r: any) => r.title)).toEqual(['Castores baja tarifas 15%'])
    expect(aiData.criticalAlerts[0]).toMatchObject({ level: 'CRÍTICA' })
  })
})

describe('reportEnforcement — alertas de brecha digital propia', () => {
  it('"Sin actividad en redes" y "Marca ausente en Google" suben a CRÍTICA; una alerta de competidor no', () => {
    const { aiData } = enforceRubrics({ criticalAlerts: [
      { title: 'Sin actividad visible en redes sociales frente a competidores activos', level: 'ALTA' },
      { title: 'Stick-A-Boom ausente en resultados orgánicos de Google', level: 'ALTA' },
      { title: 'Stickeria mantiene publicación semanal en Instagram', level: 'ALTA' },
    ] }, [], { companyName: 'Stick-A-Boom' })
    expect(aiData.criticalAlerts.map((a: any) => a.level)).toEqual(['CRÍTICA', 'CRÍTICA', 'ALTA'])
  })
})

describe('Presencia de Mercado', () => {
  it('acepta solo Nula/Mínima/Media/Alta; años u otros valores pasan a Sin verificar', () => {
    expect(normalizePresenceLevel('Alta')).toBe('Alta')
    expect(normalizePresenceLevel('minima')).toBe('Mínima')
    expect(normalizePresenceLevel('MEDIA · sucursales en 3 estados')).toBe('Media')
    expect(normalizePresenceLevel('N/A')).toBe('N/A')
    expect(normalizePresenceLevel('Estimado 3-5 años')).toBe('Sin verificar')
    expect(normalizePresenceLevel('15+ años')).toBe('Sin verificar')
  })
  it('corrige la fila del benchmark y lo registra en la auditoría', () => {
    const { aiData, audit } = enforceRubrics({ benchmarkRows: [
      { factor: 'Presencia de Mercado', client: 'Estimado 3-5 años', comp1: 'Alta', comp2: 'Estimado 5+ años', position: '3er lugar' },
      { factor: 'Presencia digital', client: 'BAJA' },
    ] }, [])
    expect(aiData.benchmarkRows[0]).toMatchObject({ client: 'Sin verificar', comp1: 'Alta', comp2: 'Sin verificar' })
    expect(aiData.benchmarkRows[1].client).toBe('BAJA')
    expect(audit.evidenceAdjustments.filter((a: any) => a.item.startsWith('benchmark')).length).toBe(2)
  })
})
