// Prompt v3 del reporte competitivo: v2 + investigación verificable (docs/roadmap/reglas-busqueda-certera.md).
//
// Se construye a partir del texto de v2 (que se conserva intacto para revertir) con sustituciones verificadas:
//  - Ventana única de fechas anclada a T0 (B.2).
//  - FASE 1 reemplazada por el plan de consultas fijo generado por código (B.4-B.6).
//  - Reglas de evidencia verificable: campo `evidence` con URL de esta corrida, fecha y cita; lista de
//    afirmaciones no observables; estados que no son movimiento; ausencias verificables (C.1-C.4).
//  - Campo `evidence` en cada elemento que puntúa del esquema JSON; métricas sociales en "No detectado".
// Si alguna ancla de v2 cambia, buildCompetitivePromptV3 lanza un error (lo detectan las pruebas).
import { buildCompetitivePromptV2 } from './competitivePromptV2'
import type { ReportWindow, SearchPlan } from '../reportResearch'

export interface PromptResearchContext {
  window: ReportWindow
  plan: SearchPlan
}

const EVIDENCE_FIELD = `"evidence": { "url": "<URL concreta devuelta por una búsqueda o lectura de ESTA investigación>", "date": "<AAAA-MM-DD del hecho o null>", "quote": "<texto literal de la página, máx. 150 caracteres>", "via": "<search|fetch>", "observed": "<precio|promocion|nota_prensa|vacante|pagina_nueva|comunicado|registro_oficial|publicacion_fechada|sectorial|ausencia>", "query": "<solo si observed = ausencia: la consulta exacta ejecutada>" }`

function replaceOnce(text: string, anchor: string, replacement: string): string {
  const i = text.indexOf(anchor)
  if (i < 0 || text.indexOf(anchor, i + anchor.length) >= 0) throw new Error(`Prompt v3: ancla de v2 no encontrada o repetida: ${anchor.slice(0, 60)}`)
  return text.slice(0, i) + replacement + text.slice(i + anchor.length)
}
function replaceAll(text: string, anchor: string, replacement: string, expected: number): string {
  const parts = text.split(anchor)
  if (parts.length - 1 !== expected) throw new Error(`Prompt v3: se esperaban ${expected} anclas "${anchor.slice(0, 50)}", hay ${parts.length - 1}`)
  return parts.join(replacement)
}

export function buildCompetitivePromptV3(project: any, dateInfo: any, ctx: PromptResearchContext): string {
  const { window: w, plan } = ctx
  const setup = project?.setup || {}
  const companyName = setup.companyName || project?.companyName || project?.name
  let p = buildCompetitivePromptV2(project, { ...dateInfo, periodStart: w.reportStart, periodEnd: w.today })

  p = replaceOnce(p, 'Reports PRO v2.1', 'Reports PRO v3.0')

  // B.2 — Ventana única.
  p = replaceOnce(p, 'REGLA DE FRESCURA — APLICAR EN CADA DATO:', `VENTANAS (todas medidas desde hoy, ${w.today}):
• Esta semana: ${w.reportStart} a ${w.today}. Solo un hecho fechado aquí cuenta como movimiento de esta semana,
  cambio CRÍTICO o alerta CRÍTICA por un movimiento del competidor.
• Reciente (E3): ${w.e3Start} a ${w.today}.
• E2 por fecha: ${w.e2Start} a ${w.e3Start}, o un hecho anunciado con fecha futura.
• Antes de ${w.e2Start}: referencia histórica; nunca suma como movimiento.
• Un hecho sin fecha legible en la página nunca es E3.

REGLA DE FRESCURA — APLICAR EN CADA DATO:`)

  // B.4-B.6 — Plan de consultas fijo.
  const planLines = plan.queries.map((q, i) => `  ${String(i + 1).padStart(2, '0')}. [${q.block}] ${q.query}`).join('\n')
  const fetchLines = plan.fetchUrls.length
    ? plan.fetchUrls.map(f => `  • web_fetch ${f.url}  (${f.competitor}) — y su página de precios o promociones si aparece`).join('\n')
    : '  • (no hay URLs registradas de competidores)'
  const start = p.indexOf('━━━ FASE 1')
  const end = p.indexOf('━━━ FASE 2')
  if (start < 0 || end < start) throw new Error('Prompt v3: no se encontró FASE 1/FASE 2 en v2')
  p = p.slice(0, start) + `━━━ FASE 1 — PLAN DE INVESTIGACIÓN OBLIGATORIO (${plan.queries.length} búsquedas fijas) ━━
El sistema verifica en el registro de búsquedas que ejecutaste TODAS estas consultas, tal cual están escritas,
antes de aceptar el reporte. Ejecútalas en este orden ANTES de escribir cualquier conclusión:
${planLines}

Lecturas directas (web_fetch) de los sitios registrados:
${fetchLines}

Después del plan puedes hacer hasta 6 búsquedas y 5 lecturas adicionales SOLO para fechar un hallazgo o llegar a
su fuente primaria. Reglas de ejecución:
1. No abandones un competidor por "no aparece" sin ejecutar sus 3 consultas.
2. Cada hallazgo que puntúe termina en una página concreta. Si el hecho está en la portada (p. ej. un banner de
   promoción), lee esa portada con web_fetch y cita esa URL con la fecha visible.
3. Un hecho de "esta semana" exige fecha explícita en la página dentro de la ventana.
4. Instagram, Facebook, TikTok y LinkedIn no son fuente de métricas. Una publicación pública con fecha puede
   citarse como hecho, sin seguidores ni interacciones.
5. Las consultas del bloque [cliente] sirven SOLO para "aparece / no aparece"; nunca para posiciones.

` + p.slice(end)

  // C.1-C.4 — Reglas de evidencia verificable (antes de la autoverificación).
  p = replaceOnce(p, '━━━ AUTOVERIFICACIÓN OBLIGATORIA ANTES DEL JSON', `━━━ EVIDENCIA VERIFICABLE (la valida el sistema contra tu registro de búsquedas) ━━
Todo elemento que aporta puntos lleva un campo "evidence": competidores con movimiento (threatFactors.move ≥ 1),
cada cambio, cada alerta CRÍTICA o ALTA, oportunidades con demanda ≥ 25, cada riesgo alto y cada precio con ↑/↓.
  ${EVIDENCE_FIELD}
Cómo calcula el sistema el nivel (el tuyo solo puede bajar, nunca subir):
• E3: la URL salió de una búsqueda o lectura de ESTA investigación, la fecha es legible y está dentro de los
  últimos 30 días, el hecho es observable y hay cita literal.
• E2: URL de esta investigación con fecha de 31-90 días, fecha futura anunciada o sin fecha.
• E1: dato sectorial (observed = "sectorial").
• E0: URL que no salió de esta investigación, sin URL, o afirmación no observable. Un E0 no puntúa: el cambio se
  excluye, la alerta baja a media, el riesgo a medio y el movimiento a 0.
• Ausencias del cliente ("${companyName} no aparece en …"): observed = "ausencia", url = null y "query" con la
  consulta exacta del plan; el sistema comprueba que se ejecutó y que ${companyName} no está en sus resultados.
NO OBSERVABLE con búsqueda web (no lo afirmes como hecho; si lo escribes, el elemento vale E0): anuncios o Google
Ads, posiciones en Google (#, top, primeras posiciones, ranking), seguidores, engagement, interacciones, número de
publicaciones o frecuencia de posteo, reseñas en Google Maps o calificaciones, y fuentes como "búsquedas
ejecutadas", "revisión de redes" o "verificación directa".
NO ES MOVIMIENTO: "mantiene", "sigue", "continúa", "domina", "sin cambios". Un estado no va en cambios ni suma
movimiento (move = 0).
socialMedia: followersEstimate y engagementLevel van siempre "No detectado"; lastPostDate solo con una
publicación fechada que hayas visto.

━━━ AUTOVERIFICACIÓN OBLIGATORIA ANTES DEL JSON`)
  p = replaceOnce(p, '□ Cada *Basis empieza con E3, E2, E1 o E0 (sin prefijo = sin evidencia).',
    '□ Cada *Basis empieza con E3, E2, E1 o E0 y cada elemento que puntúa trae "evidence" con URL de esta investigación.\n□ Ejecutaste las consultas del plan de FASE 1, todas.')
  p = replaceOnce(p, '• Mínimo 10 búsquedas web antes de estructurar la respuesta', '• Ejecutar el plan completo de FASE 1 antes de estructurar la respuesta')

  // Esquema JSON: campo evidence en cada elemento que puntúa.
  p = replaceAll(p, `"threatBasis": "<E? · a+b+c+d: hecho, fecha y fuente de cada factor>",`,
    `"threatBasis": "<E? · a+b+c+d: hecho, fecha y fuente de cada factor>",\n      ${EVIDENCE_FIELD.replace('"evidence": {', '"evidence": { "_": "solo si move ≥ 1",')},`, 1)
  p = replaceAll(p, `"evidenceBasis": "<E3|E2 · por qué es CRÍTICA o ALTA (y no MEDIA) según la rúbrica>"`,
    `"evidenceBasis": "<E3|E2 · por qué es CRÍTICA o ALTA (y no MEDIA) según la rúbrica>",\n      ${EVIDENCE_FIELD}`, 1)
  p = replaceAll(p, `"levelBasis": "<E? · por qué ese nivel, con fuente>",`,
    `"levelBasis": "<E? · por qué ese nivel, con fuente>",\n      ${EVIDENCE_FIELD},`, 2)
  p = replaceAll(p, `"scoreBasis": "<E? · a+b+c+d: evidencia de demanda, factibilidad, hueco y ventana, con fuente>",`,
    `"scoreBasis": "<E? · a+b+c+d: evidencia de demanda, factibilidad, hueco y ventana, con fuente>",\n      ${EVIDENCE_FIELD},`, 1)
  p = replaceAll(p, `"impactBasis": "<qué servicios, rutas, segmento o clientes del cliente se afectan y por qué esa banda>",`,
    `"impactBasis": "<qué servicios, rutas, segmento o clientes del cliente se afectan y por qué esa banda>",\n      ${EVIDENCE_FIELD},`, 1)
  p = replaceOnce(p, `{ "name": "<competidor registrado>", "change": "<↑ subió +X% Esta semana · [fuente] | → Estable | ↓ bajó -X% | Sin datos públicos disponibles>" }`,
    `{ "name": "<competidor registrado>", "change": "<↑ subió +X% Esta semana · [fuente] | → Estable | ↓ bajó -X% | Sin datos públicos disponibles>", ${EVIDENCE_FIELD.replace('"evidence": {', '"evidence": { "_": "solo con ↑ o ↓",')} }`)
  p = replaceOnce(p, `"followersEstimate": "<número observado o 'No detectado'>"`, `"followersEstimate": "No detectado"`)
  p = replaceOnce(p, `"engagementLevel": "<ALTO|MEDIO|BAJO|No detectado>"`, `"engagementLevel": "No detectado"`)

  p += `
Responde con el JSON completo como último bloque de texto, sin texto después del cierre.`
  return p
}
