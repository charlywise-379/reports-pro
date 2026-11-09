// Selector de versión del prompt del reporte de inteligencia competitiva.
//
// - v1: el prompt original (competitivePromptV1.ts), conservado literal para poder revertir.
// - v2: cada número que escribe la IA (amenaza, nivel de cambio, score de oportunidad, probabilidad e
//       impacto de riesgo) sale de una rúbrica de factores observables y lleva su justificación
//       (campos *Basis). Mismo conjunto de campos JSON que v1: las plantillas no cambian.
// - v3: v2 + investigación verificable: ventana única de fechas, plan de búsquedas fijo generado por código
//       y campo `evidence` (URL de esta corrida, fecha, cita) que el sistema contrasta con el registro de
//       búsquedas (docs/roadmap/reglas-busqueda-certera.md).
//
// Para revertir: cambiar ACTIVE_PROMPT_VERSION (o definir REPORT_PROMPT_VERSION=v2 / v1 en el entorno).
import { buildCompetitivePromptV1 } from './competitivePromptV1'
import { buildCompetitivePromptV2 } from './competitivePromptV2'
import { buildCompetitivePromptV3, type PromptResearchContext } from './competitivePromptV3'
import { reportWindow, buildSearchPlan } from '../reportResearch'

export type PromptVersion = 'v1' | 'v2' | 'v3'
const VERSIONS: PromptVersion[] = ['v1', 'v2', 'v3']

export const ACTIVE_PROMPT_VERSION: PromptVersion = 'v3'

/** Versión efectiva: la variable de entorno REPORT_PROMPT_VERSION (si es válida) manda sobre la constante. */
export function resolvePromptVersion(envValue: string | undefined = process.env.REPORT_PROMPT_VERSION): PromptVersion {
  const v = (envValue || '').trim().toLowerCase() as PromptVersion
  return VERSIONS.includes(v) ? v : ACTIVE_PROMPT_VERSION
}

/** Contexto de investigación por defecto (T0 = ahora); el motor pasa el suyo para que plan y verificación coincidan. */
export function defaultResearchContext(project: any, now: Date = new Date()): PromptResearchContext {
  const window = reportWindow(now)
  return { window, plan: buildSearchPlan(project, window) }
}

export function buildCompetitivePrompt(project: any, dateInfo: any, version: PromptVersion = resolvePromptVersion(), ctx?: PromptResearchContext): string {
  if (version === 'v1') return buildCompetitivePromptV1(project, dateInfo)
  if (version === 'v2') return buildCompetitivePromptV2(project, dateInfo)
  return buildCompetitivePromptV3(project, dateInfo, ctx || defaultResearchContext(project))
}

export { buildCompetitivePromptV1, buildCompetitivePromptV2, buildCompetitivePromptV3 }
export type { PromptResearchContext }
