// Fase A del reporte (investigación): el modelo de investigación ejecuta el plan de búsquedas y lecturas y
// entrega SOLO hallazgos con URL, fecha y cita. No evalúa ni redacta el reporte (eso es la fase B).
// Ver docs/roadmap/reglas-busqueda-certera.md (B.4-B.6, C.1-C.4, D.6).
import { inferBusinessType, registeredDirectCompetitors } from './promptContext'
import type { PromptResearchContext } from './competitivePromptV3'

export const RESEARCH_SYSTEM_PROMPT = `Eres un investigador de mercado para PYMES de México. Tu trabajo es buscar y leer en la web y
registrar hechos verificables con su fuente. No evalúas, no opinas y no redactas reportes.
Reglas: español de México; cada hallazgo termina en una página concreta que viste en esta investigación; si no
encuentras algo, lo dices; nunca inventas URLs, fechas, precios ni citas.`

export function buildResearchPrompt(project: any, ctx: PromptResearchContext): string {
  const { window: w, plan } = ctx
  const setup = project?.setup || {}
  const client = setup.companyName || project?.companyName || project?.name || 'el cliente'
  const competitors = registeredDirectCompetitors(setup)
  const planLines = plan.queries.map((q, i) => `${String(i + 1).padStart(2, '0')}. [${q.block}] ${q.query}`).join('\n')
  const fetchLines = plan.fetchUrls.length
    ? plan.fetchUrls.map(f => `- ${f.url}  (${f.competitor})`).join('\n')
    : '- (no hay URLs registradas)'

  return `INVESTIGACIÓN SEMANAL DE COMPETENCIA

CLIENTE: ${client} · ${setup.website || 'sin sitio registrado'}
GIRO: ${inferBusinessType(setup)} · ${setup.industry || ''}
UBICACIÓN: ${setup.city || 'No especificada'}, ${setup.country || 'México'}
COMPETIDORES DIRECTOS REGISTRADOS:
${competitors.map(c => `- ${c.name}${c.url ? ` · ${c.url}` : ''}`).join('\n') || '- (ninguno)'}

FECHAS (hoy es ${w.today}):
- Esta semana: ${w.reportStart} a ${w.today}
- Reciente: ${w.e3Start} a ${w.today}
- Hasta 90 días: desde ${w.e2Start}

PASO 1 — Ejecuta TODAS estas búsquedas, tal cual están escritas y en este orden. El sistema verifica en el registro
que se ejecutaron todas.
${planLines}

PASO 2 — Lee con web_fetch estos sitios y, si en ellos aparece un enlace a precios o promociones, léelo también:
${fetchLines}

PASO 3 — Hasta 6 búsquedas y 5 lecturas adicionales, SOLO para fechar un hallazgo o llegar a su fuente primaria.

QUÉ REGISTRAR (un hallazgo por hecho):
- Movimientos con fecha de los competidores: precios, promociones con vigencia, lanzamientos, vacantes publicadas,
  alianzas, aperturas, comunicados, cambios visibles de catálogo.
- Noticias, regulación y tendencias del sector en México o en ${setup.city || 'la ciudad del cliente'}.
- Competidores adicionales reales del mismo giro en la zona.
- Presencia del cliente: para cada consulta del bloque [cliente], si ${client} aparece o no en los resultados.

QUÉ NO REGISTRAR COMO HECHO (la búsqueda web no lo puede observar): anuncios o Google Ads, posiciones en Google,
seguidores, interacciones, frecuencia de publicación, reseñas de Google Maps o calificaciones. Un estado sin cambio
("mantiene", "sigue igual") no es un movimiento.

FORMATO DE SALIDA. Al terminar todas las búsquedas, responde SOLO con este JSON (sin texto después):
{
  "findings": [
    {
      "competitor": "<nombre del competidor, o null si es del sector o del cliente>",
      "kind": "<precio|promocion|nota_prensa|vacante|pagina_nueva|comunicado|registro_oficial|publicacion_fechada|sectorial|competidor_adicional>",
      "fact": "<el hecho en una oración, con cifras tal como aparecen>",
      "date": "<AAAA-MM-DD del hecho según la página, o null si no aparece>",
      "url": "<URL exacta de la página donde lo viste>",
      "quote": "<texto literal de esa página, máximo 150 caracteres>",
      "via": "<search|fetch>"
    }
  ],
  "clientPresence": [
    { "query": "<consulta exacta del bloque [cliente]>", "appears": <true|false>, "url": "<URL donde aparece, o null>" }
  ],
  "notes": "<una o dos oraciones: competidores sin información pública, páginas que no se pudieron leer>"
}
Máximo 40 hallazgos; prioriza los más recientes y los que afectan directamente a ${client}.`
}
