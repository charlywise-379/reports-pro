// Reglas de evaluación que el sistema hace cumplir sobre la respuesta de la IA, antes de calcular métricas.
//
// La IA evalúa y justifica; el código aplica la aritmética y la coherencia que el prompt pide, para que los
// indicadores no dependan de que el modelo siga cada regla:
//  1. Amenaza y oportunidad: la IA califica cada factor de la rúbrica y el sistema suma (con punto base y
//     máximo). Sin factores (prompt v1 o respuesta incompleta) se conserva el número declarado.
//  2. Nivel del competidor (riskLabel) derivado de la amenaza calculada.
//  3. Coherencia de alertas: competidor o cambio CRÍTICO → alerta CRÍTICA; cambio ALTO de un competidor
//     directo → al menos alerta ALTA. Se sube el nivel de la alerta relacionada o se crea una.
//  4. Riesgo de mercado solo con amenazas externas: los riesgos marcados como debilidad propia salen de
//     highRisks y pasan a áreas de mejora.
//  5. Tamaños máximos de lista fijados por el sistema.
//  6. mainAlertLevel = nivel máximo entre alertas y cambios.
//  7. Topes por nivel de evidencia (prefijo E0-E3 de cada *Basis): movimiento del competidor, demanda de la
//     oportunidad, probabilidad y permanencia en riesgos altos, nivel de los cambios y de las alertas.
//  8. Áreas de oportunidad críticas: una brecha propia con impacto ≥ 6 o en presencia digital se lista como
//     alerta CRÍTICA y área de mejora crítica (sin sumar al riesgo de mercado).
// Cada ajuste queda en el registro de auditoría (metricsJson.enforcement).

import { levelOf, alertLevelOf } from './reportScoring'
import { buildUrlIndex, verifyEvidence, verifyAbsence, STATE_NOT_MOVE, type EvidenceCheck, type ResearchLog, type ReportWindow } from './reportResearch'

export const LIST_LIMITS = {
  criticalAlerts: 3, mediumAlerts: 4, changesPerColumn: 6, opportunities: 4,
  rivalWeaknesses: 6, highRisks: 3, mediumRisks: 4, improvements: 5,
} as const

// Rúbrica de amenaza: parte de 1 y suma factores; máximo 10.
export const THREAT_FACTORS = { overlap: 3, move: 3, strength: 2, digital: 1 } as const
export const THREAT_BASE = 1
// Rúbrica de oportunidad: suma de cuatro componentes (0-100).
export const OPPORTUNITY_FACTORS = { demand: 40, feasibility: 30, gap: 20, window: 10 } as const
const OPPORTUNITY_HIGH_SCORE = 85 // un score ≥85 exige demanda E3 (demand = 40)

export interface EnforcementAudit {
  threatsFromFactors: number
  threatsAdjusted: Array<{ name: string; declared: number | null; computed: number }>
  riskLabelsAdjusted: Array<{ name: string; declared: string | null; computed: string }>
  opportunitiesFromFactors: number
  opportunitiesAdjusted: Array<{ title: string; declared: number | null; computed: number }>
  alertsUpgraded: Array<{ title: string; from: string; to: string; reason: string }>
  alertsCreated: Array<{ title: string; level: string; reason: string }>
  alertsDropped: string[]
  ownRisksMoved: string[]
  originsCorrected: string[]
  evidenceAdjustments: Array<{ item: string; rule: string; from: string | number; to: string | number }>
  missingBasis: string[]
  evidenceChecks: { scored: number; e0: number; verified: number }
  evidenceQuality: 'normal' | 'baja' | null
  mainAlertLevel: { declared: string | null; computed: string }
}

const arr = (v: unknown): any[] => (Array.isArray(v) ? v : [])

const PRESENCE_LEVELS: Record<string, string> = { nula: 'Nula', minima: 'Mínima', media: 'Media', alta: 'Alta' }
/** Celda de "Presencia de Mercado": Nula | Mínima | Media | Alta; N/A se respeta; lo demás (p. ej. años) → "Sin verificar". */
export function normalizePresenceLevel(v: unknown): string {
  const s = String(v ?? '').trim()
  if (/^(n\/a|sin verificar)$/i.test(s)) return /^n\/a$/i.test(s) ? 'N/A' : 'Sin verificar'
  const key = s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[\s·,(—-]/)[0]
  return PRESENCE_LEVELS[key] ?? 'Sin verificar'
}
const intOrNull = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && /^\s*-?\d+(\.\d+)?\s*$/.test(v)) return Number(v)
  return null
}
const factor = (v: unknown, max: number) => {
  const n = intOrNull(v)
  return n === null ? 0 : Math.max(0, Math.min(max, Math.round(n)))
}
const hasFactors = (o: unknown, keys: readonly string[]) =>
  !!o && typeof o === 'object' && keys.some(k => intOrNull((o as any)[k]) !== null)
export const fold = (s: unknown) => (typeof s === 'string' ? s : '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Amenaza 1-10 = 1 + traslape + movimiento + fuerza + presencia digital. */
export function threatFromFactors(f: any): number {
  const sum = THREAT_BASE + factor(f?.overlap, THREAT_FACTORS.overlap) + factor(f?.move, THREAT_FACTORS.move)
    + factor(f?.strength, THREAT_FACTORS.strength) + factor(f?.digital, THREAT_FACTORS.digital)
  return Math.max(1, Math.min(10, sum))
}

/** CRÍTICO solo con amenaza 9-10 y movimiento E3 de esta semana (move = 3); VIGILAR 7-8; MEDIO 5-6; BAJO 1-4. */
export function riskLabelFor(threat: number, move: number | null): string {
  if (threat >= 9) return move === null || move >= THREAT_FACTORS.move ? 'CRÍTICO' : 'VIGILAR'
  if (threat >= 7) return 'VIGILAR'
  if (threat >= 5) return 'MEDIO'
  return 'BAJO'
}

/** Score de oportunidad = demanda + factibilidad + hueco + ventana; ≥85 solo con demanda E3. */
export function opportunityFromFactors(f: any): number {
  const demand = factor(f?.demand, OPPORTUNITY_FACTORS.demand)
  const sum = demand + factor(f?.feasibility, OPPORTUNITY_FACTORS.feasibility)
    + factor(f?.gap, OPPORTUNITY_FACTORS.gap) + factor(f?.window, OPPORTUNITY_FACTORS.window)
  return demand < OPPORTUNITY_FACTORS.demand ? Math.min(OPPORTUNITY_HIGH_SCORE - 1, sum) : sum
}

// ─── Topes por nivel de evidencia (prefijo E0-E3 del *Basis) ───────────────────────
// Sin prefijo (prompt v1) no se aplica el tope: no hay con qué medirlo, y se registra como base faltante.
export function evidenceOf(basis: unknown): number | null {
  const m = /^\s*E\s*([0-3])\b/i.exec(typeof basis === 'string' ? basis : '')
  return m ? Number(m[1]) : null
}
// Movimiento verificado: E3 de esta semana +3 · E3/E2 del último mes +2 · E1 +1 · sin evidencia 0.
const MOVE_MAX_BY_EVIDENCE = [0, 1, 2, 3]
// Demanda de una oportunidad: E3 40 · E2 25 · E1 10 · sin evidencia 0.
const DEMAND_MAX_BY_EVIDENCE = [0, 10, 25, 40]
// Valores permitidos de cada componente de oportunidad (se redondea hacia abajo al permitido).
export const OPPORTUNITY_ALLOWED = { demand: [0, 10, 25, 40], feasibility: [5, 20, 30], gap: [0, 10, 20], window: [0, 5, 10] } as const
const snapDown = (v: number, allowed: readonly number[]) => allowed.filter(a => a <= v).pop() ?? allowed[0]
// Probabilidad de un riesgo alto: 90-100 solo con E3 · 70-89 con E3/E2 · E1 o menos no entra en highRisks.
const PROBABILITY_MAX_BY_EVIDENCE = [0, 0, 89, 100]
const MIN_HIGH_RISK_PROBABILITY = 20

/** Reemplaza el nivel de una categoría "CAT · NIVEL". */
const withLevel = (category: string, level: string) => {
  const parts = category.split('·').map(s => s.trim())
  return parts.length > 1 ? [...parts.slice(0, -1), level].join(' · ') : `${category.trim()} · ${level}`
}

const isOwnRisk = (r: any) => /^(propio|propia|interno|interna|debilidad)/.test(fold(r?.origin).trim())
// "Brecha: clientes esperan seguimiento que Almex no ofrece": el TÍTULO describe una carencia del cliente.
// Solo el título: la descripción de un riesgo externo suele mencionar de paso lo que le falta al cliente.
const LACK_WORDS = 'no|carece|sigue sin|aun no|todavia no|sin|nunca'
const LACK = `(${LACK_WORDS})`
function describesOwnGap(r: any, companyName?: string): boolean {
  const norm = (s: unknown) => fold(s).replace(/[^a-z0-9]+/g, ' ').trim()
  const name = norm(companyName)
  if (!name) return false
  const text = norm(r?.title)
  return new RegExp(`\\b${name}\\s+${LACK}\\b`).test(text)
}
export const CRITICAL_AREA_PREFIX = 'CRÍTICO · '
const DIGITAL_PRESENCE = /\b(seo|google|busqueda|buscador|organic|posicionamiento|redes|social|instagram|facebook|tiktok|linkedin|youtube|whatsapp|digital|web|sitio|pagina|marketplace|mercado libre|amazon|resena|ads|anuncio|campana)/
/** Alerta cuyo título es una carencia del cliente en presencia digital. */
function isOwnDigitalGapAlert(a: any, companyName?: string): boolean {
  const title = fold(a?.title).replace(/[^a-z0-9]+/g, ' ').trim()
  const name = fold(companyName).replace(/[^a-z0-9]+/g, ' ').trim()
  const own = /^(sin|ausencia|falta|nula|baja presencia|cero)\b/.test(title)
    || (!!name && new RegExp(`\\b${name}\\s+(${LACK_WORDS}|ausente|invisible|inactiv)`).test(title))
  return own && DIGITAL_PRESENCE.test(title)
}
/** Brecha propia que se lista como crítica: impacto directo en el negocio (≥ 6) o en la presencia digital. */
export function isCriticalOpportunityArea(r: any): boolean {
  const impact = intOrNull(r?.impact)
  return (impact !== null && impact >= 6) || DIGITAL_PRESENCE.test(fold(`${r?.title || ''} ${r?.description || ''}`))
}

const STOP = new Set(['para', 'como', 'desde', 'sobre', 'entre', 'hasta', 'contra', 'tras', 'este', 'esta', 'estos', 'estas', 'cliente', 'mercado', 'general'])
// Raíz de 5 letras para que "orgánica" y "orgánicas" o "tarifa" y "tarifas" coincidan.
const stems = (s: string) => new Set(fold(s).split(/[^a-z0-9]+/).filter(t => t.length >= 4 && !STOP.has(t)).map(t => t.slice(0, 5)))
const GENERIC_NAME = new Set(['transportes', 'transporte', 'grupo', 'servicios', 'logistica', 'empresa', 'compania',
  'corporativo', 'corporacion', 'mexico', 'internacional', 'agencia', 'estudio', 'the'])
const nameKeys = (s: unknown) => new Set(fold(s).split(/[^a-z0-9]+/).filter(t => t.length >= 3 && !GENERIC_NAME.has(t)))
const alertText = (a: any) => fold(`${a?.title || ''} ${a?.description || ''} ${a?.detected || ''}`)

const LEVEL_RANK: Record<string, number> = { BAJO: 1, MEDIO: 2, ALTO: 3, CRÍTICO: 4 }
const ALERT_RANK: Record<string, number> = { ALTA: 3, CRÍTICA: 4 }

export interface EnforcementResearch {
  log: ResearchLog
  window: ReportWindow
  client: { name?: string; website?: string }
}

export function enforceRubrics(aiData: any, registeredCompetitors: string[] = [], opts: { companyName?: string; research?: EnforcementResearch } = {}): { aiData: any; audit: EnforcementAudit } {
  const out = { ...(aiData || {}) }
  const audit: EnforcementAudit = {
    threatsFromFactors: 0, threatsAdjusted: [], riskLabelsAdjusted: [],
    opportunitiesFromFactors: 0, opportunitiesAdjusted: [],
    alertsUpgraded: [], alertsCreated: [], alertsDropped: [], ownRisksMoved: [],
    originsCorrected: [], evidenceAdjustments: [], missingBasis: [],
    evidenceChecks: { scored: 0, e0: 0, verified: 0 }, evidenceQuality: null,
    mainAlertLevel: { declared: typeof aiData?.mainAlertLevel === 'string' ? aiData.mainAlertLevel : null, computed: 'BAJO' },
  }
  const capped = (item: string, rule: string, from: string | number, to: string | number) =>
    audit.evidenceAdjustments.push({ item, rule, from, to })

  // Nivel de evidencia de un elemento. Sin registro de investigación (prompt v1/v2, fixtures): el declarado en
  // el prefijo del *Basis. Con registro (v3): min(declarado, calculado), donde el calculado exige URL de esta
  // corrida con fecha y hecho observable (reportResearch.verifyEvidence) o ausencia verificada del cliente.
  const research = opts.research
  const urlIndex = research ? buildUrlIndex(research.log) : null
  const evidenceLevel = (item: any, basis: unknown, texts: unknown[], label: string): { level: number | null; check: EvidenceCheck | null } => {
    const declared = evidenceOf(basis)
    if (!research || !urlIndex) return { level: declared, check: null }
    const ev = item?.evidence
    const check = fold(ev?.observed) === 'ausencia'
      ? verifyAbsence(ev, research.log, research.client)
      : verifyEvidence(ev, texts, urlIndex, research.window)
    const level = declared === null ? check.level : Math.min(declared, check.level)
    audit.evidenceChecks.scored++
    if (level === 0) audit.evidenceChecks.e0++
    if (check.verified) audit.evidenceChecks.verified++
    if (level < (declared ?? 3)) capped(label, `evidencia ${check.rule || 'insuficiente'}: nivel calculado E${check.level}`, declared === null ? 'sin nivel' : `E${declared}`, `E${level}`)
    return { level, check }
  }

  // 1-2. Amenaza y nivel de cada competidor.
  const enforceCompetitor = (c: any, withLabel: boolean) => {
    if (!c || typeof c !== 'object') return c
    const declared = intOrNull(c.threat)
    let threat = declared === null ? 0 : Math.max(0, Math.min(10, Math.round(declared)))
    let move: number | null = null
    if (hasFactors(c.threatFactors, Object.keys(THREAT_FACTORS))) {
      const f = { ...c.threatFactors }
      const m = factor(f.move, THREAT_FACTORS.move)
      // Un estado ("mantiene", "domina", "sin cambios") no es movimiento.
      if (research && m > 0 && STATE_NOT_MOVE.test(fold(c.recentMove))) {
        capped(`amenaza: ${c.name}`, 'estado-no-movimiento', m, 0); f.move = 0
      } else if (m > 0) {
        const { level: ev, check } = evidenceLevel(c, c.threatBasis, [c.recentMove], `amenaza: ${c.name}`)
        if (ev === null) audit.missingBasis.push(`amenaza: ${c.name}`)
        else {
          // E3 de los últimos 7 días → 3 · E3 de 8-30 días → 2 · E2 → 2 (1 si no tiene fecha) · E1 → 1 · E0 → 0.
          let max = MOVE_MAX_BY_EVIDENCE[ev]
          if (check && ev === 3 && (check.ageDays === null || check.ageDays > 7)) max = 2
          if (check && ev === 2 && check.dateless) max = 1
          if (m > max) { capped(`amenaza: ${c.name}`, `movimiento ${m} exige más evidencia; base E${ev}`, m, max); f.move = max }
        }
      }
      threat = threatFromFactors(f)
      move = factor(f.move, THREAT_FACTORS.move)
      audit.threatsFromFactors++
      if (declared !== threat) audit.threatsAdjusted.push({ name: c.name, declared, computed: threat })
    }
    const next = { ...c, threat }
    if (withLabel && threat > 0) {
      const label = riskLabelFor(threat, move)
      if (c.riskLabel !== label) audit.riskLabelsAdjusted.push({ name: c.name, declared: c.riskLabel ?? null, computed: label })
      next.riskLabel = label
    }
    return next
  }
  if (Array.isArray(out.competitors)) out.competitors = out.competitors.map((c: any) => enforceCompetitor(c, true))
  if (Array.isArray(out.secondaryCompetitors)) out.secondaryCompetitors = out.secondaryCompetitors.map((c: any) => enforceCompetitor(c, false))

  // Oportunidades.
  out.opportunities = arr(out.opportunities).slice(0, LIST_LIMITS.opportunities).map((o: any) => {
    if (!hasFactors(o?.scoreFactors, Object.keys(OPPORTUNITY_FACTORS))) return o
    const declared = intOrNull(o.score)
    const f: any = {}
    for (const k of Object.keys(OPPORTUNITY_ALLOWED) as Array<keyof typeof OPPORTUNITY_ALLOWED>) {
      const v = factor(o.scoreFactors[k], OPPORTUNITY_FACTORS[k])
      f[k] = snapDown(v, OPPORTUNITY_ALLOWED[k])
      if (f[k] !== v) capped(`oportunidad: ${o.title}`, `${k} solo admite ${OPPORTUNITY_ALLOWED[k].join('/')}`, v, f[k])
    }
    const { level: ev } = f.demand > 0
      ? evidenceLevel(o, o.scoreBasis, [o.description], `oportunidad: ${o.title}`)
      : { level: evidenceOf(o.scoreBasis) }
    if (ev === null) audit.missingBasis.push(`oportunidad: ${o.title}`)
    else if (f.demand > DEMAND_MAX_BY_EVIDENCE[ev]) {
      capped(`oportunidad: ${o.title}`, `demanda ${f.demand} exige más evidencia; base E${ev}`, f.demand, DEMAND_MAX_BY_EVIDENCE[ev])
      f.demand = DEMAND_MAX_BY_EVIDENCE[ev]
    }
    const score = opportunityFromFactors(f)
    audit.opportunitiesFromFactors++
    if (declared !== score) audit.opportunitiesAdjusted.push({ title: o.title, declared, computed: score })
    return { ...o, score }
  })

  // 4. Riesgos. Origen: un riesgo "externo" que describe una carencia del cliente es una brecha propia.
  const demotedRisks: any[] = []
  const risks = arr(out.highRisks).map((r: any) => {
    if (!isOwnRisk(r) && describesOwnGap(r, opts.companyName)) {
      audit.originsCorrected.push(String(r?.title || ''))
      return { ...r, origin: 'PROPIO' }
    }
    return { ...r }
  }).filter((r: any) => {
    // Riesgo alto exige E2+ y probabilidad ≥ 20; si no, baja a riesgos medios (sin número).
    const { level: ev } = evidenceLevel(r, r?.probabilityBasis, [r?.title, r?.description], `riesgo: ${r?.title}`)
    const p = intOrNull(r?.probability)
    r.__evidence = ev
    if (ev === null) { audit.missingBasis.push(`riesgo: ${r?.title}`); return true }
    if (isOwnRisk(r)) return true
    if (ev < 2 || (p !== null && p < MIN_HIGH_RISK_PROBABILITY)) {
      capped(`riesgo: ${r?.title}`, ev < 2 ? `riesgo alto exige E2+; base E${ev}` : `probabilidad < ${MIN_HIGH_RISK_PROBABILITY}`, 'alto', 'medio')
      demotedRisks.push({ icon: r.icon, title: r.title, description: r.description })
      return false
    }
    if (p !== null && p > PROBABILITY_MAX_BY_EVIDENCE[ev]) {
      capped(`riesgo: ${r?.title}`, `probabilidad ${p} exige E3; base E${ev}`, p, PROBABILITY_MAX_BY_EVIDENCE[ev])
      r.probability = PROBABILITY_MAX_BY_EVIDENCE[ev]
    }
    return true
  })
  out.mediumRisks = [...demotedRisks, ...arr(out.mediumRisks)]
  const own = risks.filter(isOwnRisk)
  out.highRisks = risks.filter(r => !isOwnRisk(r)).slice(0, LIST_LIMITS.highRisks)
  // Áreas de oportunidad críticas: una brecha propia con impacto directo en el rendimiento del negocio
  // (impacto ≥ 6) o en la presencia digital se lista como CRÍTICA, porque cerrarla aporta ventaja frente a
  // la competencia. No suma al riesgo de mercado, pero sí aparece como alerta CRÍTICA y área de mejora crítica.
  // Con registro de investigación, la brecha debe estar verificada (E2+, p. ej. ausencia comprobada) para ser alerta.
  const criticalOwn = own.filter(r => isCriticalOpportunityArea(r) && (!research || (r.__evidence ?? 0) >= 2))
  for (const r of risks) delete r.__evidence
  if (own.length) {
    audit.ownRisksMoved = own.map(r => String(r?.title || ''))
    const improvements = arr(out.improvements).filter(s => typeof s === 'string')
    const moved = own.map(r => {
      const t = String(r?.title || '')
      return t && criticalOwn.includes(r) ? `${CRITICAL_AREA_PREFIX}${t}` : t
    }).filter(t => t && !improvements.some(i => fold(i) === fold(t)))
    out.improvements = [...moved, ...improvements].slice(0, LIST_LIMITS.improvements)
  }
  out.mediumRisks = arr(out.mediumRisks).slice(0, LIST_LIMITS.mediumRisks)
  out.rivalWeaknesses = arr(out.rivalWeaknesses).slice(0, LIST_LIMITS.rivalWeaknesses)
  out.mediumAlerts = arr(out.mediumAlerts).slice(0, LIST_LIMITS.mediumAlerts)
  // Nivel de cambio por evidencia: CRÍTICO exige E3 · ALTO exige E2+ · un cambio E0 no se incluye.
  const enforceChange = (ch: any) => {
    if (!ch || typeof ch !== 'object') return ch
    const lvl = levelOf(ch.category)
    if (research && STATE_NOT_MOVE.test(fold(ch.title))) {
      capped(`cambio: ${ch.title}`, 'estado-no-movimiento', lvl || '-', 'excluido'); return null
    }
    const { level: ev, check } = evidenceLevel(ch, ch.levelBasis, [ch.title, ch.description], `cambio: ${ch.title}`)
    if (ev === null) { if (ch.levelBasis !== undefined || lvl) audit.missingBasis.push(`cambio: ${ch.title}`); return ch }
    if (ev === 0) { capped(`cambio: ${ch.title}`, 'cambio E0 no se incluye', lvl || '-', 'excluido'); return null }
    // CRÍTICO exige E3 dentro de la ventana del reporte (7 días) cuando hay registro de investigación.
    const max = ev >= 3 ? (check && (check.ageDays === null || check.ageDays > 7) ? 'ALTO' : 'CRÍTICO') : ev === 2 ? 'ALTO' : 'MEDIO'
    if (lvl && LEVEL_RANK[lvl] > LEVEL_RANK[max]) {
      capped(`cambio: ${ch.title}`, `${lvl} exige ${lvl === 'CRÍTICO' ? 'E3' : 'E2+'}; base E${ev}`, lvl, max)
      return { ...ch, category: withLevel(String(ch.category), max) }
    }
    return ch
  }
  out.changesCol1 = arr(out.changesCol1).map(enforceChange).filter(Boolean).slice(0, LIST_LIMITS.changesPerColumn)
  out.changesCol2 = arr(out.changesCol2).map(enforceChange).filter(Boolean).slice(0, LIST_LIMITS.changesPerColumn)

  // 3. Coherencia de alertas.
  const directNames = Array.from(new Set([
    ...arr(out.competitors).map((c: any) => c?.name),
    ...registeredCompetitors,
  ].filter((n): n is string => typeof n === 'string' && n.trim().length > 0)))
  // "Transportes Tresguerras" y "Tresguerras" son el mismo competidor: se comparan por sus palabras distintivas.
  const sameCompany = (x: unknown, y: unknown) => {
    const kx = nameKeys(x), ky = nameKeys(y)
    return kx.size > 0 && Array.from(kx).some(k => ky.has(k))
  }
  const isDirect = (name: unknown) => directNames.some(n => sameCompany(n, name))

  // Alerta CRÍTICA/ALTA exige E2+; con E1/E0 pasa a alertas de vigilancia (media).
  const demotedAlerts: any[] = []
  const alerts: any[] = arr(out.criticalAlerts).map((a: any) => ({ ...a, level: alertLevelOf(a) })).filter((a: any) => {
    const { level: ev } = evidenceLevel(a, a.evidenceBasis, [a.title, a.description], `alerta: ${a.title}`)
    if (ev === null) { if (a.evidenceBasis !== undefined) audit.missingBasis.push(`alerta: ${a.title}`); return true }
    if (ev >= 2) return true
    capped(`alerta: ${a.title}`, `alerta ${a.level} exige E2+; base E${ev}`, a.level, 'MEDIA')
    demotedAlerts.push({ icon: a.icon, title: a.title, source: a.detected, description: a.description })
    return false
  })
  if (demotedAlerts.length) out.mediumAlerts = [...demotedAlerts, ...out.mediumAlerts].slice(0, LIST_LIMITS.mediumAlerts)
  // El competidor debe aparecer en el TÍTULO de la alerta (la descripción suele citar a otros rivales).
  const relatedToCompetitor = (a: any, name: string) => {
    const have = new Set(fold(a?.title).split(/[^a-z0-9]+/))
    return Array.from(nameKeys(name)).some(k => have.has(k)) ? 1 : 0
  }
  // Afinidad 0-1 entre un cambio y una alerta: proporción de palabras del título del cambio presentes en la alerta.
  const relatedToChange = (a: any, ch: any) => {
    if (isDirect(ch?.competitor) && !relatedToCompetitor(a, ch.competitor)) return 0
    const want = stems(String(ch?.title || ''))
    if (!want.size) return 0
    const have = stems(alertText(a))
    let hit = 0
    for (const t of want) if (have.has(t)) hit++
    const r = hit / want.size
    return r >= 0.35 ? r : 0
  }
  const ensureAlert = (level: 'CRÍTICA' | 'ALTA', score: (a: any) => number, create: () => any, reason: string) => {
    let found: any = null, best = 0
    for (const a of alerts) { const s = score(a); if (s > best) { best = s; found = a } }
    if (found) {
      if (ALERT_RANK[found.level] < ALERT_RANK[level]) {
        audit.alertsUpgraded.push({ title: String(found.title || ''), from: found.level, to: level, reason })
        found.level = level
      }
      return
    }
    // Una ALTA nueva solo entra si hay lugar; las CRÍTICAS siempre (desplazan a las ALTAS al ordenar).
    if (level === 'ALTA' && alerts.length >= LIST_LIMITS.criticalAlerts) return
    const created = { ...create(), level, generatedBy: 'sistema' }
    audit.alertsCreated.push({ title: String(created.title || ''), level, reason })
    alerts.push(created)
  }
  const fromChange = (ch: any) => () => ({
    icon: ch.icon || '⚠️',
    title: ch.title,
    detected: [ch.date, ch.competitor].filter(Boolean).join(' · '),
    description: ch.description,
    action: 'Definir la respuesta esta semana; ver las recomendaciones prioritarias de este reporte.',
    evidenceBasis: ch.levelBasis,
    evidence: ch.evidence,
  })

  const changes = [...out.changesCol1, ...out.changesCol2]
  for (const ch of changes) {
    const lvl = levelOf(ch?.category)
    if (lvl === 'CRÍTICO') ensureAlert('CRÍTICA', a => relatedToChange(a, ch), fromChange(ch), `cambio CRÍTICO: ${ch.title}`)
  }
  for (const c of arr(out.competitors)) {
    if (c?.riskLabel !== 'CRÍTICO' || !c?.name) continue
    ensureAlert('CRÍTICA', a => relatedToCompetitor(a, c.name), () => ({
      icon: '🚨',
      title: `${c.name}: amenaza ${c.threat}/10 con movimiento verificado`,
      detected: c.sourceUrl ? `Fuente: ${c.sourceUrl}` : 'Esta semana',
      description: c.recentMove,
      action: 'Definir la respuesta esta semana; ver las recomendaciones prioritarias de este reporte.',
      evidenceBasis: c.threatBasis,
      evidence: c.evidence,
    }), `competidor CRÍTICO: ${c.name}`)
  }
  // Alerta que ya describe una brecha propia de presencia digital ("Sin actividad en redes…",
  // "Stick-A-Boom ausente en Google…") → CRÍTICA por la regla de áreas de oportunidad.
  for (const a of alerts) {
    if (a.level === 'CRÍTICA' || !isOwnDigitalGapAlert(a, opts.companyName)) continue
    audit.alertsUpgraded.push({ title: String(a.title || ''), from: a.level, to: 'CRÍTICA', reason: 'área de oportunidad de presencia digital' })
    a.level = 'CRÍTICA'
  }
  for (const r of criticalOwn) {
    ensureAlert('CRÍTICA', a => relatedToChange(a, { title: r.title }), () => ({
      icon: r.icon || '🎯',
      title: r.title,
      detected: 'Área de oportunidad frente a la competencia',
      description: r.description,
      action: r.mitigation || 'Definir la respuesta esta semana; ver las recomendaciones prioritarias de este reporte.',
      evidenceBasis: r.probabilityBasis,
      evidence: r.evidence,
    }), `área de oportunidad crítica: ${r.title}`)
  }
  for (const ch of changes) {
    if (levelOf(ch?.category) === 'ALTO' && isDirect(ch?.competitor)) {
      ensureAlert('ALTA', a => relatedToChange(a, ch), fromChange(ch), `cambio ALTO de competidor directo: ${ch.title}`)
    }
  }

  // CRÍTICAS primero (orden original dentro de cada nivel), máximo del sistema.
  const ordered = alerts
    .map((a, i) => ({ a, i }))
    .sort((x, y) => (ALERT_RANK[y.a.level] - ALERT_RANK[x.a.level]) || (x.i - y.i))
    .map(x => x.a)
  audit.alertsDropped = ordered.slice(LIST_LIMITS.criticalAlerts).map(a => String(a.title || ''))
  out.criticalAlerts = ordered.slice(0, LIST_LIMITS.criticalAlerts)

  // 6. Nivel de la alerta principal = máximo entre alertas y cambios.
  let top = out.mediumAlerts.length ? LEVEL_RANK.MEDIO : LEVEL_RANK.BAJO
  for (const a of out.criticalAlerts) top = Math.max(top, a.level === 'CRÍTICA' ? LEVEL_RANK.CRÍTICO : LEVEL_RANK.ALTO)
  for (const ch of changes) { const l = levelOf(ch?.category); if (l) top = Math.max(top, LEVEL_RANK[l]) }
  const mainAlertLevel = Object.keys(LEVEL_RANK).find(k => LEVEL_RANK[k] === top) || 'BAJO'
  audit.mainAlertLevel.computed = mainAlertLevel
  out.mainAlertLevel = mainAlertLevel

  // Precios: una flecha (↑/↓) sin evidencia E2+ de esta corrida no se publica como cambio.
  if (research && Array.isArray(out.priceTrends)) {
    out.priceTrends = out.priceTrends.map((pt: any) => {
      if (typeof pt?.change !== 'string' || !/^[↑↓]/.test(pt.change.trim())) return pt
      const { level } = evidenceLevel(pt, null, [pt.change], `precio: ${pt.name}`)
      if ((level ?? 0) >= 2) return pt
      capped(`precio: ${pt.name}`, 'precio sin evidencia verificable', pt.change, '→ Sin cambios verificables')
      return { ...pt, change: '→ Sin cambios verificables' }
    })
  }
  // Presencia de Mercado: solo la escala Nula/Mínima/Media/Alta; años o cualquier otro valor → "Sin verificar".
  if (Array.isArray(out.benchmarkRows)) {
    out.benchmarkRows = out.benchmarkRows.map((row: any) => {
      if (!/presencia de mercado/i.test(String(row?.factor || ''))) return row
      const fixed: any = { ...row }
      for (const k of ['client', 'comp1', 'comp2', 'comp3', 'comp4', 'comp5']) {
        if (fixed[k] === undefined || fixed[k] === null) continue
        const level = normalizePresenceLevel(fixed[k])
        if (level !== fixed[k]) capped(`benchmark Presencia de Mercado: ${k}`, 'escala Nula/Mínima/Media/Alta', String(fixed[k]), level)
        fixed[k] = level
      }
      return fixed
    })
  }

  // Más del 40 % de los elementos puntuados en E0 → semana con poca evidencia verificable.
  if (research) {
    const { scored, e0 } = audit.evidenceChecks
    audit.evidenceQuality = scored > 0 && e0 / scored > 0.4 ? 'baja' : 'normal'
  }

  return { aiData: out, audit }
}

/** Resumen numérico del registro de auditoría (para metricsJson). */
export function auditSummary(a: EnforcementAudit) {
  return {
    threatsFromFactors: a.threatsFromFactors,
    threatsAdjusted: a.threatsAdjusted.length,
    riskLabelsAdjusted: a.riskLabelsAdjusted.length,
    opportunitiesFromFactors: a.opportunitiesFromFactors,
    opportunitiesAdjusted: a.opportunitiesAdjusted.length,
    alertsUpgraded: a.alertsUpgraded.length,
    alertsCreated: a.alertsCreated.length,
    alertsDropped: a.alertsDropped.length,
    ownRisksMoved: a.ownRisksMoved.length,
    originsCorrected: a.originsCorrected.length,
    evidenceAdjustments: a.evidenceAdjustments.length,
    missingBasis: a.missingBasis.length,
    evidenceChecks: a.evidenceChecks,
    evidenceQuality: a.evidenceQuality,
    detail: a,
  }
}
