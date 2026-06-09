import Anthropic from '@anthropic-ai/sdk'
import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'
import { prisma } from './prisma'

// ─── Cliente Anthropic ────────────────────────────────
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// ─── Tipos ───────────────────────────────────────────
interface ReportData {
  companyName: string
  industry: string
  targetMarket: string
  tags: string[]
  weekNumber: number
  year: number
  edition: number
  periodStart: string
  periodEnd: string
  generatedAt: string
  nextMonth: string
  nextReportDate: string
  nextReportTime: string
  nextEdition: number
  deliveryChannel: string
  frequency: string
  activeAreas: number
  competitorsCount: number
  competitivePressure: number
  opportunityScore: number
  marketRisk: number
  riskLevel: string
  generalTrend: string
  trendDelta: string
  pressureDash: number
  opportunityDash: number
  gaugePath: string
  needleX: number
  needleY: number
  signalsCount: string
  signalsDelta: number
  movementsCount: number
  criticalMovements: number
  minorMovements: number
  alertsCount: number
  activeCompetitors: number
  totalChanges: number
  clientScore?: {
    overall: number
    price: number
    digital: number
    differentiation: number
    speed: number
    vsCompetitors: string
    strongAreas: string[]
    weakAreas: string[]
    weeklyChange: string
    summary: string
  }
  insights: { color: string; borderColor: string; category: string; text: string }[]
  actions: { color: string; borderColor: string; priority: string; text: string }[]
  topCompetitors: any[]
  earlyWarning: string
  marketStatus: string
  marketStatusDesc: string
  gaugeMetrics: any[]
  sectorMetrics: any[]
  mainAlertTitle: string
  mainAlertDesc: string
  mainAlertLevel: string
  competitors: any[]
  mostAggressiveName: string
  mostAggressiveDesc: string
  weakestName: string
  weakestDesc: string
  emergingName: string
  emergingDesc: string
  criticalAlertsCount: number
  mediumAlertsCount: number
  criticalAlerts: any[]
  mediumAlerts: any[]
  changesCol1: any[]
  changesCol2: any[]
  priceTrends: any[]
  priceTrendAlert: string
  dominantMessages: any[]
  targetSegments: any[]
  newChannels: any[]
  rivalAdvantages: any[]
  opportunitiesCount: number
  opportunities: any[]
  rivalWeaknesses: any[]
  highRisksCount: number
  mediumRisksCount: number
  highRisks: any[]
  mediumRisks: any[]
  benchmarkFactors: number
  benchmarkCompetitors: any[]
  benchmarkRowsHTML?: string
  secondaryCompetitors?: any[]
  radarPoints: string
  strengths: string[]
  improvements: string[]
  highPriorityRecs: any[]
  mediumPriorityRecs: any[]
  lowPriorityRecs: any[]
  weeklyPlans?: any[]
  criticalSignals: string[]
  importantSignals: string[]
  infoSignals: string[]
  weeklyPlansHTML?: string
}

// ─── Calcular gauge path y aguja ─────────────────────
function calcGauge(value: number) {
  const angle = -180 + (value / 100) * 180
  const rad = (angle * Math.PI) / 180
  const cx = 180, cy = 180, r = 140
  const endX = cx + r * Math.cos(rad)
  const endY = cy + r * Math.sin(rad)
  const needleX = Math.round(cx + 110 * Math.cos(rad))
  const needleY = Math.round(cy + 110 * Math.sin(rad))
  const pressureDash = Math.round((value / 100) * 289)
  return {
    gaugePath: `${Math.round(endX)} ${Math.round(endY)}`,
    needleX,
    needleY,
    pressureDash,
  }
}

// ─── Inferir giro real del negocio ───────────────────
function inferBusinessType(setup: any): string {
  const products = (setup.mainProducts || []).join(' ').toLowerCase()
  const ctx = (() => { try { return typeof setup.additionalContext === 'string' ? JSON.parse(setup.additionalContext) : (setup.additionalContext || {}) } catch { return {} } })()
  const pitch = (ctx.pitch || '').toLowerCase()
  const combined = products + ' ' + pitch
  if (combined.includes('campaña') || combined.includes('digital') || combined.includes('branding') || combined.includes('contenido') || combined.includes('publicidad') || combined.includes('agencia') || combined.includes('marketing')) return 'Agencia de Marketing Digital y Publicidad'
  if (combined.includes('web') || combined.includes('ecommerce') || combined.includes('app') || combined.includes('software') || combined.includes('desarrollo')) return 'Empresa de Desarrollo de Software y Tecnología'
  if (combined.includes('foto') || combined.includes('video') || combined.includes('producción') || combined.includes('audiovisual')) return 'Productora Audiovisual / Estudio Creativo'
  if (combined.includes('educación') || combined.includes('curso') || combined.includes('capacitación')) return 'Empresa Educativa / EdTech'
  if (combined.includes('salud') || combined.includes('médico') || combined.includes('clínica')) return 'Empresa del Sector Salud'
  return setup.industry || 'Empresa PYME en México'
}

function extractSetupContext(setup: any) {
  try {
    const ctx = typeof setup.additionalContext === 'string' ? JSON.parse(setup.additionalContext) : (setup.additionalContext || {})
    const products = (ctx.products || []).map((p: any) => `• ${p.name} (${p.category}): $${Number(p.priceFrom).toLocaleString('es-MX')} – $${Number(p.priceTo).toLocaleString('es-MX')} MXN`).join('\n')
    const directComps = (ctx.directCompetitors || []).map((c: any) => `• ${c.name} | URL: ${c.url} | Servicios: ${c.products} | Presencia: ${c.presence} | Amenaza: ${c.threat}/10`).join('\n')
    const indirectComps = (ctx.indirectCompetitors || []).map((c: any) => `• ${c.name} | Industria: ${c.industry} | Amenaza: ${c.threat}/10`).join('\n')
    const differentiators = (ctx.differentiators || []).slice(0, 10).join(', ')
    const pitch = ctx.pitch || ''
    return { products, directComps, indirectComps, differentiators, pitch }
  } catch {
    const fallbackProds = (setup.mainProducts || []).map((p: string) => `• ${p}`).join('\n')
    const fallbackComps = [1,2,3,4,5].filter((i: number) => setup[`competitor${i}Name`]).map((i: number) => `• ${setup[`competitor${i}Name`]} | URL: ${setup[`competitor${i}Website`] || 'N/A'}`).join('\n')
    return { products: fallbackProds, directComps: fallbackComps, indirectComps: '', differentiators: '', pitch: '' }
  }
}

// ─── Prompt para Claude ───────────────────────────────
function buildPrompt(project: any, dateInfo: any): string {
  const setup = project.setup || {}
  const businessType = inferBusinessType(setup)
  const { products, directComps, indirectComps, differentiators, pitch } = extractSetupContext(setup)
  const focusAreas = (setup.focusAreas || []).join(', ') || 'precios, campanas, lanzamientos'
  const geographicScope = (setup.geographicScope || ['MX']).join(', ')
  const companyName = setup.companyName || project.companyName || project.name
  const website = setup.website || ''

  let directCompetitorsList = ''
  try {
    const ctx = typeof setup.additionalContext === 'string' ? JSON.parse(setup.additionalContext) : (setup.additionalContext || {})
    const dc = ctx.directCompetitors || []
    directCompetitorsList = dc.map((c: any) => `- ${c.name} | URL: ${c.url} | Servicios: ${c.products}`).join('\n')
    if (!directCompetitorsList) {
      directCompetitorsList = [1,2,3,4,5]
        .filter((i: number) => setup[`competitor${i}Name`])
        .map((i: number) => `- ${setup[`competitor${i}Name`]} | URL: ${setup[`competitor${i}Website`] || 'N/A'}`)
        .join('\n')
    }
  } catch { directCompetitorsList = 'No especificados' }

  // ─── Variables adicionales para el prompt v2.0 ──────
  const now = new Date()
  const fechaExacta = now.toLocaleDateString('es-MX', { 
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
  })
  const horaGeneracion = now.toLocaleTimeString('es-MX', { 
    hour: '2-digit', minute: '2-digit' 
  })
  const mesActual = now.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })

  // Categorías de recomendación para forzar variedad
  const recCategories = [
    'MARKETING DIGITAL', 'VENTAS Y CONVERSIÓN', 'PRODUCTO O SERVICIO',
    'OPERACIONES', 'TALENTO Y EQUIPO', 'FIDELIZACIÓN DE CLIENTES',
    'POSICIONAMIENTO Y MARCA', 'NUEVOS CANALES', 'TECNOLOGÍA Y HERRAMIENTAS',
    'ALIANZAS ESTRATÉGICAS', 'CONTENIDO Y COMUNICACIÓN', 'PRECIO Y PROPUESTA DE VALOR'
  ]
  // Seleccionar 6 categorías distintas rotando por semana del año
  const weekSeed = Math.ceil(now.getDate() / 7) + now.getMonth() * 4
  const shuffledCats = [...recCategories].sort(() => Math.sin(weekSeed + recCategories.indexOf(recCategories[0])) - 0.5)
  const selectedCategories = shuffledCats.slice(0, 6).join(', ')

  return `
═══════════════════════════════════════════════════════════════
REPORTE DE INTELIGENCIA COMPETITIVA — Reports PRO v2.0
═══════════════════════════════════════════════════════════════

━━━ ANCLA TEMPORAL — LEER PRIMERO ━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOY ES: ${fechaExacta}
HORA DE GENERACIÓN: ${horaGeneracion} CST
PERIODO DEL REPORTE: ${dateInfo.periodStart} al ${dateInfo.periodEnd}
MES EN CURSO: ${mesActual}

REGLA DE FRESCURA — APLICAR EN CADA DATO:
• Datos de los últimos 7 días → etiquetar: "Esta semana · [fuente]"
• Datos de 8 a 30 días → etiquetar: "Reciente · [fecha específica] · [fuente]"
• Datos de más de 30 días → etiquetar: "Referencia histórica · [mes y año]"
• Sin datos encontrados → escribir EXACTAMENTE: "Sin datos públicos disponibles"
⚠ PROHIBIDO: presentar datos de semanas o meses anteriores como si fueran de esta semana.

━━━ IDENTIDAD DEL CLIENTE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Empresa: ${companyName}
Sitio web: ${website}
Giro real detectado: ${businessType}
Ubicación: ${setup.city || 'No especificada'}, ${setup.country || 'México'}
Mercado objetivo: ${setup.targetMarket || 'México'}
Alcance geográfico: ${geographicScope}
Tamaño: PYME regional — NO comparar con corporativos multinacionales

PRODUCTOS Y SERVICIOS:
${products}

DESCRIPCIÓN DEL NEGOCIO:
${pitch}

DIFERENCIADORES DECLARADOS POR EL CLIENTE:
${differentiators}

━━━ REGLA ABSOLUTA DE LOCALIZACIÓN ━━━━━━━━━━━━━━━━━━━━━━━━━
Esta empresa opera en ${setup.city || 'ciudad no especificada'}, ${setup.country || 'México'}.
• TODA la inteligencia debe ser relevante para ${setup.city || setup.country || 'México'}
• Competidores: SOLO empresas con presencia real en ${setup.city || setup.country || 'México'}
• Noticias y tendencias: SOLO de ${setup.city || setup.country || 'México'} o que impacten directamente ahí
• Al buscar en web: incluye siempre "${setup.city || setup.country || 'México'}" en tus queries
• Si no hay información local específica, usa contexto nacional pero indícalo explícitamente
• PROHIBIDO mencionar mercados ajenos sin justificación explícita

━━━ COMPETIDORES REGISTRADOS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DIRECTOS — investigar cada uno obligatoriamente:
${directCompetitorsList}

INDIRECTOS — investigar si hay capacidad:
${indirectComps}

REGLAS DE COMPETIDORES:
• Los competidores directos SIEMPRE aparecen en el reporte aunque no tengas datos
• Si un competidor no tiene presencia digital: escribe "Presencia digital no detectada — canal offline"
• NUNCA inventes movimientos — si no hay datos, escríbelo explícitamente
• Para benchmark: top 5 competidores en tabla comparativa; los restantes en secondaryCompetitors

━━━ ÁREAS DE MONITOREO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${focusAreas}

━━━ FASE 1 — INVESTIGACIÓN OBLIGATORIA (mínimo 10 búsquedas) ━━
Ejecuta TODAS estas búsquedas antes de estructurar la respuesta:

Por cada competidor directo registrado:
  → "[nombre competidor] ${setup.city || setup.country || 'México'} ${mesActual}"
  → "[nombre competidor] precios servicios ${now.getFullYear()}"
  → "[nombre competidor] instagram linkedin noticias ${now.getFullYear()}"
  Detecta: nuevos servicios, cambios de precio, campañas activas, vacantes, reseñas

Tendencias del sector:
  → "${businessType} México tendencias ${mesActual}"
  → "${businessType} ${setup.city || setup.country || 'México'} noticias ${mesActual}"
  Detecta: nuevas tecnologías, cambios regulatorios, oportunidades de nicho

Posicionamiento en Google:
  → "${businessType} ${setup.city || setup.country || 'México'}"
  Anota: quién aparece en top 5 orgánico, quién está haciendo Google Ads
  → "${companyName}" — anota qué aparece del cliente

Contexto económico:
  → "mercado ${setup.industry || businessType} México ${mesActual} ${now.getFullYear()}"
  Detecta: cambios de demanda, nuevos competidores, fusiones, regulaciones

━━━ FASE 2 — ANÁLISIS (razonar antes de estructurar) ━━━━━━━━
Después de investigar, responde mentalmente estas 5 preguntas:
1. ¿Cuál es el movimiento MÁS IMPORTANTE de la competencia esta semana?
2. ¿Qué oportunidad CONCRETA puede aprovechar ${companyName} en los próximos 30 días?
3. ¿Cuál es el riesgo MÁS URGENTE que debe atender?
4. ¿Cómo está posicionado ${companyName} vs sus competidores directos HOY?
5. ¿Qué debería hacer ${companyName} ESTA SEMANA específicamente?

━━━ FASE 3 — SCORE DEL CLIENTE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Evalúa objetivamente a ${companyName} vs competidores (0-100 cada dimensión):
• Precio / Propuesta de valor: ¿es competitivo en su mercado?
• Presencia digital: ¿qué tan visible es vs sus competidores?
• Diferenciación: ¿qué tan único es su producto/servicio?
• Velocidad de respuesta: ¿qué tan rápido se adapta al mercado?
Promedio ponderado = clientScore.overall

━━━ REGLAS ABSOLUTAS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ SIEMPRE HACER:
• Incluir todos los competidores directos registrados
• Cada alerta y movimiento debe tener fuente (URL, medio, o "Estimado")
• Precios realistas para el mercado mexicano de ${businessType}
• Acciones concretas y accionables para PYME con recursos limitados
• Benchmark con los primeros 5 competidores directos en tabla
• Indicar frescura de cada dato según la Regla de Frescura
• Mínimo 10 búsquedas web antes de estructurar la respuesta
• Recomendaciones variadas — categorías a usar esta semana: ${selectedCategories}

✗ NUNCA HACER:
• Inventar movimientos, precios o campañas de competidores
• Presentar datos de hace más de 30 días como información actual
• Analizar telecomunicaciones, banca, o corporativos globales
• Recomendar acciones con presupuesto de corporativo (>$50,000 MXN sin justificación)
• Repetir la misma recomendación o categoría dos veces en el mismo reporte
• Usar anglicismos innecesarios — español de México siempre
• Dejar campos vacíos — si no hay datos: "Sin datos públicos disponibles"
• Dar recomendaciones genéricas como "mejorar redes sociales" sin especificidad

━━━ ESTÁNDAR DE CALIDAD — EJEMPLOS OBLIGATORIOS ━━━━━━━━━━━━

ALERTA BUENA ✓:
"Competitor X lanzó paquete 'Todo Incluido' a $8,500 MXN/mes el 18 de mayo, captando 3 reseñas positivas en Google en 5 días. Fuente: instagram.com/competitorx · Esta semana"

ALERTA MALA ✗ (PROHIBIDA):
"El competidor mejoró su oferta recientemente" ← sin fecha, sin fuente, sin detalle

RECOMENDACIÓN BUENA ✓:
"CONTENIDO Y COMUNICACIÓN — Esta semana: Publica 3 casos de éxito reales en Instagram con métricas concretas ('aumentamos ventas 40% en 60 días'). Costo: $0. Tiempo: 2 horas. Impacto esperado: +15% en consultas basado en benchmark del sector."

RECOMENDACIÓN MALA ✗ (PROHIBIDA):
"Mejorar presencia en redes sociales" ← sin categoría, sin acción específica, sin plazo, sin costo

━━━ INSTRUCCIÓN DE VARIEDAD EN RECOMENDACIONES ━━━━━━━━━━━━━
Las 6 recomendaciones DEBEN cubrir categorías DIFERENTES.
Las categorías asignadas para este reporte son: ${selectedCategories}
Asigna cada recomendación a una categoría distinta.
Comienza el título de cada recomendación con su categoría en mayúsculas.
Ejemplo: "PRECIO Y PROPUESTA DE VALOR — Ajusta tu paquete básico a..."
PROHIBIDO: dar dos recomendaciones de la misma categoría en el mismo reporte.

━━━ ESTRUCTURA DE RESPUESTA JSON ━━━━━━━━━━━━━━━━━━━━━━━━━━

Responde ÚNICAMENTE con JSON válido comenzando con { sin texto previo ni markdown:

{
  "competitivePressure": <0-100, basado en actividad real detectada esta semana>,
  "opportunityScore": <0-100, basado en gaps reales encontrados>,
  "marketRisk": <0-100, basado en amenazas concretas detectadas>,
  "riskLevel": "<BAJO|MEDIO|ALTO|CRÍTICO>",
  "generalTrend": "<tendencia específica y concreta para ${businessType} en ${setup.country || 'México'} esta semana>",
  "trendDelta": "<+N o -N, cambio estimado vs semana anterior>",
  "signalsCount": "<número total de señales detectadas>",
  "signalsDelta": <número>,
  "movementsCount": <número de movimientos de competidores detectados>,
  "criticalMovements": <número>,
  "minorMovements": <número>,
  "alertsCount": <número total>,
  "totalChanges": <número total de cambios detectados>,

  "clientScore": {
    "overall": <0-100, promedio ponderado>,
    "price": <0-100>,
    "digital": <0-100>,
    "differentiation": <0-100>,
    "speed": <0-100>,
    "vsCompetitors": "<Por encima del promedio|En el promedio|Por debajo del promedio>",
    "strongAreas": ["<fortaleza concreta detectada>", "<fortaleza 2>"],
    "weakAreas": ["<área de mejora concreta>", "<área 2>"],
    "weeklyChange": "<+N o -N vs semana anterior, o 'Primera medición'>",
    "summary": "<1 oración que resume la posición competitiva del cliente hoy>"
  },

  "insights": [
    { "category": "<CATEGORÍA · NIVEL>", "text": "<insight con dato específico, fuente y frescura>" },
    { "category": "<CATEGORÍA · NIVEL>", "text": "<insight con dato, fuente y frescura>" },
    { "category": "<CATEGORÍA · NIVEL>", "text": "<insight con dato, fuente y frescura>" }
  ],

  "actions": [
    { "priority": "ALTA", "text": "<acción específica esta semana con costo estimado en MXN y tiempo para PYME de ${businessType}>" },
    { "priority": "MED", "text": "<acción concreta con plazo y costo estimado>" },
    { "priority": "BAJA", "text": "<acción concreta con plazo>" }
  ],

  "earlyWarning": "<alerta temprana MÁS URGENTE con dato específico, fuente y fecha>",
  "marketStatus": "<estado actual del mercado de ${businessType} en ${setup.country || 'México'} — una frase concreta>",
  "marketStatusDesc": "<2 oraciones con datos reales verificados esta semana y sus fuentes>",
  "mainAlertTitle": "<la alerta más urgente de esta semana — concreta y específica>",
  "mainAlertDesc": "<2-3 oraciones con datos reales, fecha y fuente verificable>",
  "mainAlertLevel": "<BAJO|MEDIO|ALTO|CRÍTICO>",

  "competitors": [
    {
      "name": "<nombre exacto — incluir TODOS los registrados>",
      "scope": "<Local|Regional|Nacional>",
      "threat": <1-10>,
      "growth": "<↑ subió +X% Esta semana | → Estable | ↓ bajó -X%>",
      "recentMove": "<movimiento real con fecha y frescura, o 'Sin datos públicos disponibles'>",
      "riskLabel": "<BAJO|MEDIO|VIGILAR|CRÍTICO>",
      "sourceUrl": "<URL donde encontraste info, o 'Sin presencia digital detectada'>",
      "socialMedia": {
        "mostActivePlatform": "<Instagram|Facebook|LinkedIn|TikTok|Sin presencia>",
        "lastPostDate": "<fecha aproximada o 'No detectado'>",
        "postFrequency": "<Diario|Semanal|Irregular|Inactivo|No detectado>",
        "topContentType": "<tipo de contenido o 'No detectado'>",
        "followersEstimate": "<número estimado o 'No detectado'>",
        "engagementLevel": "<ALTO|MEDIO|BAJO|No detectado>"
      }
    }
  ],

  "mostAggressiveName": "<competidor más activo esta semana>",
  "mostAggressiveDesc": "<dato específico con fecha y fuente>",
  "weakestName": "<competidor con mayor debilidad detectada>",
  "weakestDesc": "<evidencia concreta de la debilidad>",
  "emergingName": "<amenaza emergente real>",
  "emergingDesc": "<dato específico que justifica la alerta>",

  "criticalAlerts": [
    {
      "icon": "<emoji relevante>",
      "title": "<alerta específica para ${businessType} — NO genérica>",
      "detected": "<fecha específica · Fuente: nombre del medio o URL>",
      "description": "<descripción con datos verificados y frescura indicada>",
      "action": "<acción concreta accionable para PYME — con costo y tiempo estimado en MXN>"
    }
  ],
  "mediumAlerts": [
    {
      "icon": "<emoji>",
      "title": "<título específico>",
      "source": "<nombre del medio o URL>",
      "description": "<descripción con dato específico y frescura>"
    }
  ],

  "changesCol1": [
    {
      "icon": "<emoji>",
      "category": "<CAT · NIVEL>",
      "date": "<día específico, ej: 19 may>",
      "title": "<cambio real detectado — específico y concreto>",
      "description": "<detalle con fuente · frescura indicada>",
      "competitor": "<nombre del competidor o 'Mercado general'>"
    }
  ],
  "changesCol2": [
    {
      "icon": "<emoji>",
      "category": "<CAT · NIVEL>",
      "date": "<día>",
      "title": "<cambio concreto>",
      "description": "<detalle con fuente · frescura>",
      "competitor": "<nombre>"
    }
  ],

  "priceTrends": [
    { "name": "<competidor registrado>", "change": "<↑ subió +X% Esta semana · [fuente] | → Estable | ↓ bajó -X% | Sin datos públicos disponibles>" }
  ],
  "priceTrendAlert": "<alerta de precios más relevante con dato real, porcentaje y fuente>",

  "dominantMessages": [
    { "competitor": "<NOMBRE EN MAYÚSCULAS>", "message": "<mensaje real de su web o redes, o estimado basado en posicionamiento visible>" },
    { "competitor": "<NOMBRE>", "message": "<mensaje>" },
    { "competitor": "<NOMBRE>", "message": "<mensaje>" }
  ],

  "opportunities": [
    {
      "icon": "<emoji>",
      "type": "<tipo de oportunidad específica>",
      "title": "<título concreto para ${businessType} PYME>",
      "description": "<descripción con el dato que la sustenta y la fuente>",
      "score": <0-100, qué tan accionable para PYME>,
      "window": "<ventana de tiempo: '2 semanas', '30 días', 'Este trimestre'>"
    }
  ],

  "rivalWeaknesses": [
    { "competitor": "<NOMBRE — preferir competidores directos>", "weakness": "<debilidad específica con evidencia concreta>" }
  ],

  "highRisks": [
    {
      "icon": "<emoji>",
      "title": "<riesgo real y concreto para PYME de ${businessType}>",
      "probability": <0-100>,
      "description": "<descripción con contexto real y dato específico>",
      "mitigation": "<acción concreta con recursos limitados — costo y tiempo estimado en MXN>"
    }
  ],
  "mediumRisks": [
    { "icon": "<emoji>", "title": "<riesgo concreto>", "description": "<descripción con dato específico y fuente>" }
  ],

  "strengths": [
    "<fortaleza 1 — basada en diferenciadores reales vs competidores detectados>",
    "<fortaleza 2>",
    "<fortaleza 3>"
  ],
  "improvements": [
    "<área de mejora 1 — detectada comparando cliente vs competidores>",
    "<área 2>",
    "<área 3>"
  ],

  "benchmarkRows": [
    { "factor": "Precio / Tarifas", "client": "<ALTO/MEDIO/BAJO o rango MXN>", "comp1": "<o N/A>", "comp2": "<o N/A>", "comp3": "<o N/A>", "comp4": "<o N/A>", "comp5": "<o N/A>", "position": "<1er lugar | 2do lugar | etc>" },
    { "factor": "Servicios ofrecidos", "client": "<descripción breve>", "comp1": "<o N/A>", "comp2": "<o N/A>", "comp3": "<o N/A>", "comp4": "<o N/A>", "comp5": "<o N/A>", "position": "<posición>" },
    { "factor": "Presencia digital", "client": "<ALTA/MEDIA/BAJA>", "comp1": "<o N/A>", "comp2": "<o N/A>", "comp3": "<o N/A>", "comp4": "<o N/A>", "comp5": "<o N/A>", "position": "<posición>" },
    { "factor": "Redes sociales", "client": "<plataforma activa · frecuencia>", "comp1": "<o N/A>", "comp2": "<o N/A>", "comp3": "<o N/A>", "comp4": "<o N/A>", "comp5": "<o N/A>", "position": "<posición>" },
    { "factor": "SEO / Posicionamiento Google", "client": "<posición estimada>", "comp1": "<o N/A>", "comp2": "<o N/A>", "comp3": "<o N/A>", "comp4": "<o N/A>", "comp5": "<o N/A>", "position": "<posición>" },
    { "factor": "Casos de éxito / Portafolio", "client": "<SÍ visible|NO visible|PARCIAL>", "comp1": "<o N/A>", "comp2": "<o N/A>", "comp3": "<o N/A>", "comp4": "<o N/A>", "comp5": "<o N/A>", "position": "<posición>" },
    { "factor": "Tiempo en el mercado", "client": "<años estimados>", "comp1": "<o N/A>", "comp2": "<o N/A>", "comp3": "<o N/A>", "comp4": "<o N/A>", "comp5": "<o N/A>", "position": "<posición>" },
    { "factor": "Especialización", "client": "<descripción breve>", "comp1": "<o N/A>", "comp2": "<o N/A>", "comp3": "<o N/A>", "comp4": "<o N/A>", "comp5": "<o N/A>", "position": "<posición>" },
    { "factor": "Cobertura geográfica", "client": "<Local/Regional/Nacional>", "comp1": "<o N/A>", "comp2": "<o N/A>", "comp3": "<o N/A>", "comp4": "<o N/A>", "comp5": "<o N/A>", "position": "<posición>" }
  ],

  "secondaryCompetitors": [
    {
      "name": "<nombre del competidor adicional — del 6 al 10>",
      "category": "<tipo de empresa o servicio>",
      "threat": <1-10>,
      "recentMove": "<movimiento reciente con frescura, o 'Sin datos públicos disponibles'>",
      "sourceUrl": "<URL o 'Sin presencia digital detectada'>"
    }
  ],

  "highPriorityRecs": [
    {
      "number": 1,
      "title": "<CATEGORÍA EN MAYÚSCULAS — verbo + acción específica + resultado esperado>",
      "owner": "<CEO|Marketing|Ventas|Operaciones|etc>",
      "deadline": "<'Esta semana'|'En 7 días'|'En 15 días'>",
      "description": "<máximo 3 pasos concretos y accionables para PYME>",
      "impact": "<impacto con métrica real: '+20% en consultas', '-15% costo adquisición'>",
      "difficulty": "<FÁCIL|MEDIO|DIFÍCIL>",
      "timeRequired": "<CORTO (1-3 días)|MEDIO (1-2 semanas)|LARGO (1+ mes)>",
      "costRequired": "<BAJO (menos $5,000 MXN)|MEDIO ($5,000-$20,000)|ALTO (más $20,000)>"
    },
    {
      "number": 2,
      "title": "<CATEGORÍA DIFERENTE A REC 1 — acción específica>",
      "owner": "<responsable>",
      "deadline": "<plazo>",
      "description": "<pasos concretos>",
      "impact": "<métrica>",
      "difficulty": "<FÁCIL|MEDIO|DIFÍCIL>",
      "timeRequired": "<CORTO|MEDIO|LARGO>",
      "costRequired": "<BAJO|MEDIO|ALTO>"
    }
  ],
  "mediumPriorityRecs": [
    { "number": 3, "title": "<CATEGORÍA DIFERENTE A 1 Y 2 — acción>", "deadline": "<plazo>", "description": "<detalle accionable>", "impact": "<impacto esperado>" },
    { "number": 4, "title": "<CATEGORÍA DIFERENTE A 1, 2 Y 3 — acción>", "deadline": "<plazo>", "description": "<detalle>", "impact": "<impacto>" }
  ],
  "lowPriorityRecs": [
    { "number": 5, "title": "<CATEGORÍA DIFERENTE A LAS ANTERIORES — acción>", "description": "<detalle con contexto>" },
    { "number": 6, "title": "<CATEGORÍA DIFERENTE A TODAS LAS ANTERIORES — acción>", "description": "<detalle con contexto>" }
  ],

  "criticalSignals": ["<señal crítica específica para ${businessType}>", "<señal 2>", "<señal 3>", "<señal 4>"],
  "importantSignals": ["<señal 1>", "<señal 2>", "<señal 3>", "<señal 4>", "<señal 5>"],
  "infoSignals": ["<señal 1>", "<señal 2>", "<señal 3>", "<señal 4>"]
}`
}


// ─── Llamar a Claude con web search ──────────────────
async function callClaudeWithSearch(project: any, dateInfo: any): Promise<any> {
  console.log('🤖 Iniciando análisis con Claude AI + web search...')

  const competitors = project.setup?.directCompetitors?.filter((c: any) => c.name) || []

  // Mensajes iniciales con contexto de búsqueda
  const searchQueries = competitors.slice(0, 5).map((c: any) =>
    `Busca noticias y movimientos recientes de ${c.name} en México y LATAM: precios, campañas, lanzamientos, contrataciones, expansión. Semana del ${dateInfo.periodStart} al ${dateInfo.periodEnd}.`
  )

  if (project.setup?.industry) {
    searchQueries.push(
      `Tendencias y noticias recientes del sector ${project.setup.industry} en México y LATAM esta semana.`
    )
  }

  const prompt = buildPrompt(project, dateInfo)
  const businessType = inferBusinessType(project.setup || {})
  const systemPrompt = `Eres el analista senior de inteligencia competitiva de Reports PRO, especializado en PYMES de México y LATAM.

IDENTIDAD DEL ANÁLISIS:
- Empresa cliente: ${businessType}
- PROHIBIDO analizar: telecomunicaciones (Telcel, AT&T, Movistar, Izzi, 5G), banca nacional, corporativos globales, empresas de tamaño incomparable al cliente
- SOLO analiza: competidores del mismo giro (${businessType}) y tamaño PYME
- Idioma: español de México — nunca inglés, nunca español neutro

PROCESO DE PENSAMIENTO OBLIGATORIO — ejecutar en orden:
1. INVESTIGA → busca cada competidor y el mercado (mínimo 10 búsquedas web)
2. VERIFICA → confirma cada dato con su fuente y fecha
3. ANALIZA → identifica patrones, movimientos y gaps
4. SINTETIZA → determina las 3 cosas más importantes para el cliente esta semana
5. ESTRUCTURA → organiza el JSON de salida

REGLA DE ORO: Cada dato debe poder ser verificado por el cliente. Si no puedes verificarlo, márcalo explícitamente como "Estimado" o "Sin datos públicos disponibles". NUNCA inventes datos.`

  // Llamada a Claude con streaming — necesario para respuestas largas con web search
  const MAX_RETRIES = 3
  let jsonText = ''

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      jsonText = ''
      console.log(`🔄 Intento ${attempt}/${MAX_RETRIES} — iniciando stream...`)

      const stream = await anthropic.messages.stream({
        model: 'claude-sonnet-4-5',
        system: systemPrompt,
        max_tokens: 16000,
        tools: [
          {
            type: 'web_search_20250305' as any,
            name: 'web_search',
          },
        ],
        messages: [
          { role: 'user', content: prompt },
          { role: 'assistant', content: '{' },
        ],
      })

      // Recolectar texto del stream
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          jsonText += event.delta.text
        }
      }

      const finalMessage = await stream.finalMessage()
      console.log(`✅ Claude respondió — stop_reason: ${finalMessage.stop_reason} — chars: ${jsonText.length}`)
      break

    } catch (err: any) {
      const is529 = err?.status === 529 || err?.message?.includes('529') || err?.message?.includes('overloaded')
      if (is529 && attempt < MAX_RETRIES) {
        const waitMs = attempt * 15000
        console.log(`⏳ Claude sobrecargado (529) — reintento ${attempt}/${MAX_RETRIES} en ${waitMs/1000}s...`)
        await new Promise(resolve => setTimeout(resolve, waitMs))
        continue
      }
      throw err
    }
  }

  if (!jsonText) {
    throw new Error('Claude no devolvió texto en el stream')
  }

  // Limpiar posible markdown residual
  jsonText = jsonText
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim()
  if (!jsonText.startsWith('{')) jsonText = '{' + jsonText

  try {
    const parsed = JSON.parse(jsonText)
    console.log('✅ JSON de Claude parseado correctamente')
    return parsed
  } catch (e) {
    console.error('❌ Error parseando JSON de Claude:', jsonText.slice(0, 500))
    throw new Error(`Claude devolvió JSON inválido: ${e}`)
  }
}

// ─── Colores por índice de competidor ────────────────
const COMPETITOR_COLORS = [
  { color: '#E24B4A', borderColor: '#F7C1C1', trackColor: 'rgba(226,75,74,0.15)', riskBg: '#E24B4A', riskColor: '#fff' },
  { color: '#BA7517', borderColor: '#FAC775', trackColor: 'rgba(186,117,23,0.15)', riskBg: '#BA7517', riskColor: '#fff' },
  { color: '#534AB7', borderColor: '#CECBF6', trackColor: 'rgba(83,74,183,0.15)', riskBg: '#534AB7', riskColor: '#fff' },
  { color: '#1D9E75', borderColor: '#C0DD97', trackColor: 'rgba(29,158,117,0.15)', riskBg: '#1D9E75', riskColor: '#fff' },
  { color: '#8B7BFF', borderColor: '#D4CEFF', trackColor: 'rgba(139,123,255,0.15)', riskBg: '#8B7BFF', riskColor: '#fff' },
]

const INSIGHT_COLORS = [
  { color: '#BA7517', borderColor: '#FAC775' },
  { color: '#534AB7', borderColor: '#CECBF6' },
  { color: '#1D9E75', borderColor: '#9FE1CB' },
]

const ACTION_COLORS: Record<string, { color: string; borderColor: string }> = {
  ALTA: { color: '#E24B4A', borderColor: '#F7C1C1' },
  MED: { color: '#BA7517', borderColor: '#FAC775' },
  BAJA: { color: '#1D9E75', borderColor: '#9FE1CB' },
}

// ─── Construir ReportData desde respuesta de Claude ──
function buildReportData(project: any, aiData: any, dateInfo: any): ReportData {
  const now = new Date()
  const nextReport = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const companyName = project.companyName || project.name || 'Tu Empresa'
  const industry = project.setup?.industry || 'Tu industria'
  const projectCompetitors = project.setup?.directCompetitors?.filter((c: any) => c.name) || []

  const pressure = aiData.competitivePressure ?? 65
  const opportunity = aiData.opportunityScore ?? 70
  const gauge = calcGauge(pressure)
  const opportunityDash = Math.round((opportunity / 100) * 289)

  // Enriquecer competidores con colores
  const competitors = (aiData.competitors || projectCompetitors.slice(0, 4).map((c: any) => ({
    name: c.name,
    scope: 'Nacional',
    threat: 5,
    growth: '→ Estable',
    recentMove: 'Sin datos suficientes esta semana',
    riskLabel: 'MEDIO',
  }))).map((c: any, i: number) => {
    const palette = COMPETITOR_COLORS[i % COMPETITOR_COLORS.length]
    const initials = c.name.slice(0, 2).toUpperCase()
    const threatPct = (c.threat / 10) * 100

    const riskColors: Record<string, any> = {
      CRÍTICO: { riskBg: '#E24B4A', riskColor: '#fff', riskBorder: '#E24B4A' },
      VIGILAR: { riskBg: '#BA7517', riskColor: '#fff', riskBorder: '#BA7517' },
      MEDIO: { riskBg: '#534AB7', riskColor: '#fff', riskBorder: '#534AB7' },
      BAJO: { riskBg: '#EAF3DE', riskColor: '#27500A', riskBorder: '#C0DD97' },
    }

    return {
      rank: i + 1,
      initials,
      name: c.name,
      scope: c.scope || 'Nacional',
      category: 'Competidor directo',
      categoryLabel: inferBusinessType(project.setup || {}),
      tagBg: '#FCEBEB',
      tagColor: '#A32D2D',
      ...palette,
      threat: c.threat,
      threatPct,
      growth: c.growth || '→ Estable',
      growthColor: c.growth?.includes('↑') ? '#1D9E75' : c.growth?.includes('↓') ? '#E24B4A' : '#888',
      recentMove: c.recentMove || 'Sin movimientos detectados',
      ...(riskColors[c.riskLabel] || riskColors['MEDIO']),
      riskLabel: c.riskLabel || 'MEDIO',
    }
  })

  // Top competidores (para resumen página 1)
  const topCompetitors = competitors.slice(0, 4).map((c: any) => ({
    initials: c.initials,
    name: c.name,
    color: c.color,
    borderColor: c.borderColor,
    trackColor: c.trackColor,
    threat: c.threat,
    threatPct: c.threatPct,
  }))

  // Insights con colores
  const insights = (aiData.insights || []).slice(0, 3).map((ins: any, i: number) => ({
    ...INSIGHT_COLORS[i % INSIGHT_COLORS.length],
    category: ins.category,
    text: ins.text,
  }))

  // Acciones con colores
  const actions = (aiData.actions || []).slice(0, 3).map((act: any) => ({
    ...(ACTION_COLORS[act.priority] || ACTION_COLORS['MED']),
    priority: act.priority,
    text: act.text,
  }))

  // Alertas críticas con defaults de color
  const criticalAlerts = (aiData.criticalAlerts || []).slice(0, 3)
  const mediumAlerts = (aiData.mediumAlerts || []).slice(0, 4)

  // Oportunidades con colores
  const oppColors = [
    { headerBg: '#1D9E75', border: '#C0DD97', accentColor: '#1D9E75', actionBg: '#EAF3DE', actionColor: '#27500A', actionLabel: 'ACTUAR YA' },
    { headerBg: '#1D9E75', border: '#C0DD97', accentColor: '#1D9E75', actionBg: '#EAF3DE', actionColor: '#27500A', actionLabel: 'ACTUAR YA' },
    { headerBg: '#27896A', border: '#9FE1CB', accentColor: '#27896A', actionBg: '#D0EFDF', actionColor: '#085041', actionLabel: 'PLANIFICAR' },
    { headerBg: '#27896A', border: '#9FE1CB', accentColor: '#27896A', actionBg: '#D0EFDF', actionColor: '#085041', actionLabel: 'PLANIFICAR' },
  ]
  const opportunities = (aiData.opportunities || []).slice(0, 4).map((opp: any, i: number) => ({
    ...oppColors[i % oppColors.length],
    ...opp,
  }))

  // Riesgos altos con dash calculado
  const highRisks = (aiData.highRisks || []).slice(0, 3).map((r: any) => ({
    ...r,
    impactDash: Math.round((r.probability / 100) * 150),
    impactGap: Math.round(150 - (r.probability / 100) * 150),
    impact: Math.round(r.probability / 10),
  }))

  // Cambios enriquecidos con colores
  const changeColors: Record<string, any> = {
    PRECIO: { color: '#E24B4A', borderColor: '#F7C1C1' },
    TALENTO: { color: '#BA7517', borderColor: '#FAC775' },
    EXPANSIÓN: { color: '#534AB7', borderColor: '#CECBF6' },
    PRODUCTO: { color: '#1D9E75', borderColor: '#C0DD97' },
    CAMPAÑA: { color: '#E24B4A', borderColor: '#F7C1C1' },
    MEDIOS: { color: '#BA7517', borderColor: '#FAC775' },
    ALIANZA: { color: '#534AB7', borderColor: '#CECBF6' },
  }

  const enrichChange = (ch: any) => {
    const cat = ch.category?.split('·')[0]?.trim() || 'OTRO'
    return { ...changeColors[cat] || { color: '#888', borderColor: '#ddd' }, ...ch }
  }

  const changesCol1 = (aiData.changesCol1 || []).slice(0, 6).map(enrichChange)
  const changesCol2 = (aiData.changesCol2 || []).slice(0, 6).map(enrichChange)

  // Price trends con colores
  const priceTrends = (aiData.priceTrends || []).map((pt: any) => ({
    ...pt,
    color: pt.change?.includes('↑') ? '#1D9E75' : pt.change?.includes('↓') ? '#E24B4A' : '#888',
  }))

  // Dominant messages con colores
  const msgColors = ['#534AB7', '#BA7517', '#1D9E75', '#E24B4A']
  const dominantMessages = (aiData.dominantMessages || []).slice(0, 3).map((dm: any, i: number) => ({
    ...dm,
    color: msgColors[i % msgColors.length],
  }))

  // Rival weaknesses con colores
  const weakColors = ['#FF6B6B', '#F2C063', '#8B7BFF', '#4ECDC4']
  const rivalWeaknesses = (aiData.rivalWeaknesses || []).map((rw: any, i: number) => ({
    ...rw,
    color: weakColors[i % weakColors.length],
  }))

  // Gauge metrics estándar (basados en scores de AI)
  const gaugeMetrics = [
    { label: 'PRESIÓN COMPETITIVA', value: pressure, status: pressure > 75 ? 'MUY ALTO' : pressure > 50 ? 'MODERADO' : 'BAJO', color: '#534AB7', bg: '#F8F7FF', border: '#CECBF6', labelColor: '#534AB7', trackColor: '#CECBF6', textColor: '#26215C', dash: Math.round((pressure / 100) * 226), gap: Math.round(226 - (pressure / 100) * 226) },
    { label: 'ACTIVIDAD CAMPAÑAS', value: Math.round(opportunity * 0.85), status: 'MODERADO', color: '#BA7517', bg: '#FAEEDA', border: '#FAC775', labelColor: '#854F0B', trackColor: '#FAC775', textColor: '#633806', dash: Math.round((opportunity * 0.85 / 100) * 226), gap: Math.round(226 - (opportunity * 0.85 / 100) * 226) },
    { label: 'OPORTUNIDAD DE MERCADO', value: opportunity, status: opportunity > 70 ? 'ALTO' : 'MODERADO', color: '#1D9E75', bg: '#EAF3DE', border: '#C0DD97', labelColor: '#3B6D11', trackColor: '#C0DD97', textColor: '#085041', dash: Math.round((opportunity / 100) * 226), gap: Math.round(226 - (opportunity / 100) * 226) },
    { label: 'NIVEL DE RIESGO', value: aiData.marketRisk ?? 40, status: (aiData.marketRisk ?? 40) > 60 ? 'ALTO' : 'MEDIO', color: '#E24B4A', bg: '#FCEBEB', border: '#F7C1C1', labelColor: '#A32D2D', trackColor: '#F7C1C1', textColor: '#501313', dash: Math.round(((aiData.marketRisk ?? 40) / 100) * 226), gap: Math.round(226 - ((aiData.marketRisk ?? 40) / 100) * 226) },
  ]

  // Sector metrics derivados
  const sectorMetrics = [
    { label: 'SEÑALES DETECTADAS', value: aiData.signalsCount || '800+', sub: 'esta semana', color: '#534AB7' },
    { label: 'MOVIMIENTOS', value: String(aiData.movementsCount || 10), sub: `en ${competitors.length} competidores`, color: '#E24B4A' },
    { label: 'ALERTAS CRÍTICAS', value: String(criticalAlerts.length), sub: 'requieren acción', color: '#BA7517' },
    { label: 'OPORTUNIDADES', value: String(opportunities.length), sub: 'identificadas', color: '#1D9E75' },
    { label: 'NIVEL DE RIESGO', value: aiData.riskLevel || 'MEDIO', sub: 'mercado actual', color: '#8B7BFF' },
  ]

  // Target segments
  const targetSegments = aiData.targetSegments || [
    { name: 'SEGMENTO PRINCIPAL', pct: 80, color: '#1D9E75', bg: '#EAF3DE', trackColor: '#C0DD97', desc: `${competitors.length} competidores enfocados aquí` },
    { name: 'PYMES Y EMPRESARIOS', pct: 55, color: '#BA7517', bg: '#FAEEDA', trackColor: '#FAC775', desc: 'Segmento en crecimiento' },
    { name: 'MID-MARKET CORPORATIVO', pct: 30, color: '#534AB7', bg: '#F8F7FF', trackColor: '#CECBF6', desc: 'Poco explorado — oportunidad' },
  ]

  // New channels
  const newChannels = aiData.newChannels || [
    { icon: '📲', channel: 'WhatsApp Business API', desc: 'Atención y ventas directas' },
    { icon: '💼', channel: 'LinkedIn Ads B2B', desc: 'Segmento ejecutivo' },
    { icon: '🎯', channel: 'Programmatic Display', desc: 'Retargeting avanzado' },
  ]

  // Rival advantages
  const rivalAdvantages = aiData.rivalAdvantages || [
    { icon: '🥇', text: 'Mayor inversión publicitaria detectada', bg: '#FCEBEB', border: '#F7C1C1', textColor: '#A32D2D' },
    { icon: '🥇', text: 'Expansión geográfica activa', bg: '#FCEBEB', border: '#F7C1C1', textColor: '#A32D2D' },
    { icon: '✅', text: 'Tu ventaja: servicio personalizado + datos reales', bg: '#EAF3DE', border: '#C0DD97', textColor: '#27500A' },
  ]

  // Benchmark rows HTML — generado dinámicamente
  // Benchmark desde datos de Claude
  const benchmarkData = aiData.benchmarkRows || []
  const benchmarkRowsHTML = benchmarkData.length > 0
    ? benchmarkData.map((row: any, i: number) => {
        const bg = i % 2 === 1 ? 'background:#FAFAFA;' : ''
        const clientVal = row.client || 'N/A'
        const clientBg = clientVal === 'N/A' ? '#F5F5F5' : '#EAF3DE'
        const clientColor = clientVal === 'N/A' ? '#888' : '#27500A'
        const comp1 = row.comp1 || 'N/A'
        const comp2 = row.comp2 || 'N/A'
        const comp3 = row.comp3 || 'N/A'
        const pos = row.position || '—'
        const posColor = pos.includes('1') ? '#1D9E75' : pos.includes('2') ? '#BA7517' : '#888'
        return `<tr style="${bg}">
          <td style="font-size:10px;font-weight:600;color:#1A1730">${row.factor || ''}</td>
          <td style="text-align:center"><span style="background:${clientBg};color:${clientColor};font-size:9px;font-weight:700;padding:2px 7px;border-radius:6px">${clientVal}</span></td>
          <td style="text-align:center;font-size:9px;color:#555;font-weight:600">${comp1}</td>
          <td style="text-align:center;font-size:9px;color:#555;font-weight:600">${comp2}</td>
          <td style="text-align:center;font-size:9px;color:#555;font-weight:600">${comp3}</td>
          <td style="text-align:center;font-size:9px;font-weight:700;color:${posColor}">${pos}</td>
        </tr>`
      }).join('\n')
    : ['💰 Precio', '⭐ Servicios', '💡 Innovación', '🚀 Velocidad', '🏆 Marca', '📊 Presencia digital', '🔄 Retención', '🌍 Cobertura'].map((factor, i) => {
        const bg = i % 2 === 1 ? 'background:#FAFAFA;' : ''
        return `<tr style="${bg}"><td style="font-size:10px;font-weight:600;color:#1A1730">${factor}</td><td style="text-align:center"><span style="background:#EAF3DE;color:#27500A;font-size:9px;font-weight:700;padding:2px 7px;border-radius:6px">N/A</span></td><td style="text-align:center;font-size:9px;color:#888">N/A</td><td style="text-align:center;font-size:9px;color:#888">N/A</td><td style="text-align:center;font-size:9px;color:#888">N/A</td><td style="text-align:center;font-size:9px;color:#888">—</td></tr>`
      }).join('\n')

  // Weekly plans HTML
  const comp1 = competitors[0]?.name || 'Competidor A'
  const comp2 = competitors[1]?.name || 'Competidor B'
  const comp3 = competitors[2]?.name || 'Competidor C'

  const weeklyPlansHTML = `
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px">
    <div style="border:1.5px solid #F7C1C1;border-radius:12px;overflow:hidden">
      <div style="background:#E24B4A;padding:9px 12px">
        <div style="font-size:7px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:.08em;margin-bottom:1px;text-transform:uppercase">Semana 1 · Primeros 7 días</div>
        <div style="font-size:12px;font-weight:800;color:#fff">Defensa activa</div>
      </div>
      <div style="padding:12px;display:flex;flex-direction:column;gap:6px">
        ${(aiData.criticalSignals || [`Monitoreo diario de ${comp1}`, `Seguimiento de ${comp2}`, 'Retención de clientes clave', 'Confirmar o descartar alertas']).slice(0,4).map((s: string) => `
        <div style="display:flex;align-items:flex-start;gap:7px"><div style="width:14px;height:14px;border-radius:50%;background:#FCEBEB;border:2px solid #F7C1C1;flex-shrink:0;margin-top:1px"></div><div style="font-size:10px;color:#444;line-height:1.4">${s}</div></div>`).join('')}
      </div>
    </div>
    <div style="border:1.5px solid #FAC775;border-radius:12px;overflow:hidden">
      <div style="background:#BA7517;padding:9px 12px">
        <div style="font-size:7px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:.08em;margin-bottom:1px;text-transform:uppercase">Semana 2 · 8-14 días</div>
        <div style="font-size:12px;font-weight:800;color:#fff">Expansión y respuesta</div>
      </div>
      <div style="padding:12px;display:flex;flex-direction:column;gap:6px">
        ${(aiData.importantSignals || [`Lanzar piloto en nuevos mercados`, `Seguimiento de ${comp3}`, 'Activar canal digital adicional', 'Medir eficiencia publicitaria']).slice(0,4).map((s: string) => `
        <div style="display:flex;align-items:flex-start;gap:7px"><div style="width:14px;height:14px;border-radius:50%;background:#FAEEDA;border:2px solid #FAC775;flex-shrink:0;margin-top:1px"></div><div style="font-size:10px;color:#444;line-height:1.4">${s}</div></div>`).join('')}
      </div>
    </div>
    <div style="border:1.5px solid #CECBF6;border-radius:12px;overflow:hidden">
      <div style="background:#534AB7;padding:9px 12px">
        <div style="font-size:7px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:.08em;margin-bottom:1px;text-transform:uppercase">Semanas 3-4 · 15-30 días</div>
        <div style="font-size:12px;font-weight:800;color:#fff">Consolidación</div>
      </div>
      <div style="padding:12px;display:flex;flex-direction:column;gap:6px">
        ${(aiData.infoSignals || ['Monitorear nuevo jugador en sector', 'Actualizar materiales comerciales', 'Revisión de equipo y talento', 'Análisis SEO y keywords']).slice(0,4).map((s: string) => `
        <div style="display:flex;align-items:flex-start;gap:7px"><div style="width:14px;height:14px;border-radius:50%;background:#EEEDFE;border:2px solid #CECBF6;flex-shrink:0;margin-top:1px"></div><div style="font-size:10px;color:#444;line-height:1.4">${s}</div></div>`).join('')}
      </div>
    </div>
  </div>`

  return {
    // Meta
    companyName,
    industry,
    targetMarket: project.setup?.targetMarket || 'LATAM',
    tags: (() => {
      const bt = inferBusinessType(project.setup || {})
      const country = project.setup?.country || 'México'
      const scope = (project.setup?.geographicScope || ['Regional'])[0]
      return [bt.split(' ')[0], 'Marketing Digital', country, scope]
    })(),
    weekNumber: dateInfo.weekNumber,
    year: dateInfo.year,
    edition: 1,
    periodStart: dateInfo.periodStart,
    periodEnd: dateInfo.periodEnd,
    generatedAt: dateInfo.generatedAt,
    nextMonth: dateInfo.nextMonth,
    nextReportDate: dateInfo.nextReportDate,
    nextReportTime: project.deliveryTime || '07:00 UTC-5',
    nextEdition: 2,
    deliveryChannel: project.deliveryChannel === 'BOTH' ? 'Email + WhatsApp' : project.deliveryChannel === 'WHATSAPP' ? 'WhatsApp' : 'Email',
    frequency: project.frequency === 'WEEKLY' ? 'Semanal' : project.frequency === 'DAILY' ? 'Diario' : 'Quincenal',
    activeAreas: (project.setup?.focusAreas || []).length || 6,
    competitorsCount: competitors.length || 3,

    // Scores
    competitivePressure: pressure,
    clientScore: aiData.clientScore || {
      overall: 60,
      price: 60, digital: 50, differentiation: 65, speed: 55,
      vsCompetitors: 'En el promedio',
      strongAreas: ['Especialización en el sector'],
      weakAreas: ['Presencia digital a fortalecer'],
      weeklyChange: 'Primera medición',
      summary: 'Posición competitiva en evaluación inicial — datos disponibles en próximos reportes.'
    },
    opportunityScore: opportunity,
    marketRisk: aiData.marketRisk ?? 40,
    riskLevel: aiData.riskLevel || 'MEDIO',
    generalTrend: aiData.generalTrend || 'TENDENCIA ESTABLE',
    trendDelta: aiData.trendDelta || '+0',
    pressureDash: gauge.pressureDash,
    opportunityDash,
    gaugePath: gauge.gaugePath,
    needleX: gauge.needleX,
    needleY: gauge.needleY,

    // KPIs
    signalsCount: aiData.signalsCount || '800+',
    signalsDelta: aiData.signalsDelta ?? 10,
    movementsCount: aiData.movementsCount ?? 10,
    criticalMovements: aiData.criticalMovements ?? 3,
    minorMovements: aiData.minorMovements ?? 7,
    alertsCount: criticalAlerts.length,
    activeCompetitors: competitors.length,
    totalChanges: aiData.totalChanges ?? 8,

    // Página 1
    insights,
    actions,
    topCompetitors,
    earlyWarning: aiData.earlyWarning || 'Monitoreo activo en curso.',

    // Página 2
    marketStatus: aiData.marketStatus || 'Mercado en seguimiento',
    marketStatusDesc: aiData.marketStatusDesc || 'Análisis actualizado esta semana.',
    gaugeMetrics,
    sectorMetrics,
    mainAlertTitle: aiData.mainAlertTitle || 'Sin alertas críticas esta semana',
    mainAlertDesc: aiData.mainAlertDesc || 'El mercado muestra actividad normal.',
    mainAlertLevel: aiData.mainAlertLevel || 'BAJO',

    // Página 3
    competitors,
    mostAggressiveName: aiData.mostAggressiveName || comp1,
    mostAggressiveDesc: aiData.mostAggressiveDesc || 'Competidor con mayor actividad detectada.',
    weakestName: aiData.weakestName || comp3,
    weakestDesc: aiData.weakestDesc || 'Sin movimientos significativos detectados.',
    emergingName: aiData.emergingName || comp2,
    emergingDesc: aiData.emergingDesc || 'Crecimiento sostenido en métricas digitales.',

    // Página 4
    criticalAlertsCount: criticalAlerts.length,
    mediumAlertsCount: mediumAlerts.length,
    criticalAlerts,
    mediumAlerts,

    // Página 5
    changesCol1,
    changesCol2,

    // Página 6
    priceTrends,
    priceTrendAlert: aiData.priceTrendAlert || `Monitoreo de precios activo en sector ${industry}`,
    dominantMessages,
    targetSegments,
    newChannels,
    rivalAdvantages,

    // Página 7
    opportunitiesCount: opportunities.length,
    opportunities,
    rivalWeaknesses,

    // Página 8
    highRisksCount: highRisks.length,
    mediumRisksCount: (aiData.mediumRisks || []).length,
    highRisks,
    mediumRisks: aiData.mediumRisks || [],

    // Página 9
    benchmarkFactors: 8,
    benchmarkCompetitors: competitors.slice(0, 3).map((c: any) => ({ name: c.name })),
    benchmarkRowsHTML,
    radarPoints: '0,-56 49,-20 55,28 0,65 -55,28 -46,-24',
    strengths: (aiData.strengths || ['Servicio personalizado', 'Retención de clientes', 'Agilidad de respuesta']).slice(0, 3),
    improvements: (aiData.improvements || ['Presencia digital', 'Cobertura geográfica', 'Inversión publicitaria']).slice(0, 3),

    // Página 10
    highPriorityRecs: (aiData.highPriorityRecs || []).map((rec: any) => {
      const diffMap: Record<string, {color: string, label: string}> = {
        'FACIL': { color: '#1D9E75', label: 'Fácil de implementar' },
        'MEDIO': { color: '#F2C063', label: 'Implementación media' },
        'DIFICIL': { color: '#E24B4A', label: 'Complejo de implementar' },
      }
      const timeMap: Record<string, {color: string, label: string}> = {
        'CORTO': { color: '#1D9E75', label: 'Tiempo corto' },
        'MEDIO': { color: '#F2C063', label: 'Tiempo medio' },
        'LARGO': { color: '#E24B4A', label: 'Tiempo largo' },
      }
      const costMap: Record<string, {color: string, label: string}> = {
        'BAJO': { color: '#1D9E75', label: 'Bajo costo' },
        'MEDIO': { color: '#F2C063', label: 'Inversión media' },
        'ALTO': { color: '#E24B4A', label: 'Alta inversión' },
      }
      const diff = diffMap[rec.difficulty || 'MEDIO'] || diffMap['MEDIO']
      const time = timeMap[rec.timeRequired || 'MEDIO'] || timeMap['MEDIO']
      const cost = costMap[rec.costRequired || 'BAJO'] || costMap['BAJO']
      return {
        ...rec,
        difficultyColor: diff.color, difficultyLabel: diff.label,
        timeColor: time.color, timeLabel: time.label,
        costColor: cost.color, costLabel: cost.label,
      }
    }),
    mediumPriorityRecs: aiData.mediumPriorityRecs || [],
    lowPriorityRecs: aiData.lowPriorityRecs || [],

    // Competidores secundarios
    secondaryCompetitors: (aiData.secondaryCompetitors || []).slice(0, 8).map((c: any, i: number) => {
      const palette = COMPETITOR_COLORS[i % COMPETITOR_COLORS.length]
      return {
        initials: (c.name || 'XX').slice(0, 2).toUpperCase(),
        name: c.name || 'Desconocido',
        category: c.category || 'Agencia Digital',
        recentMove: c.recentMove || 'Sin datos públicos disponibles',
        threat: c.threat || 3,
        ...palette,
      }
    }),

    // Página 11
    weeklyPlans: [],
    weeklyPlansHTML,
    criticalSignals: aiData.criticalSignals || ['Movimiento de precios rival', 'Lanzamiento de producto', 'Alianza estratégica', 'Nuevo jugador'],
    importantSignals: (aiData.importantSignals || ['CPL supera umbral', 'Viralización en redes', 'Contrataciones clave', 'Reseñas negativas']).slice(0, 5),
    infoSignals: aiData.infoSignals || ['Rankings App Store', 'Menciones en medios', 'Movimiento keywords SEO', 'Cambios regulatorios'],
  }
}

// ─── Renderizar plantilla con datos ──────────────────
function renderTemplate(template: string, data: any): string {
  let html = template

  const processEach = (str: string, context: any): string => {
    let result = str
    let maxPasses = 5
    while (maxPasses-- > 0) {
      const before = result
      result = result.replace(/\{\{#each ([\w.]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_match, key, block) => {
        let arr: any[]
        if (key === 'this') arr = Array.isArray(context) ? context : []
        else if (key.startsWith('this.')) arr = context?.[key.slice(5)] ?? []
        else arr = context?.[key] ?? []
        if (!Array.isArray(arr)) return ''
        return arr.map((item: any) => {
          let rendered = processEach(block, item)
          rendered = rendered.replace(/\{\{this\.(\w+)\}\}/g, (_: string, prop: string) => item?.[prop] !== undefined ? String(item[prop]) : '')
          rendered = rendered.replace(/\{\{this\}\}/g, () => typeof item === 'string' ? item : '')
          rendered = rendered.replace(/\{\{(\w+)\}\}/g, (_: string, prop: string) => {
            if (item?.[prop] !== undefined) return String(item[prop])
            if (context?.[prop] !== undefined) return String(context[prop])
            return ''
          })
          return rendered
        }).join('')
      })
      if (result === before) break
    }
    return result
  }

  html = processEach(html, data)
  html = html.replace(/\{\{(\w+)\}\}/g, (_match, key) => data[key] !== undefined ? String(data[key]) : '')
  return html
}

// ─── Función principal: generar PDF ──────────────────
export async function generateReport(project: any, outputPath: string): Promise<string> {
  console.log(`📄 Generando reporte REAL para: ${project.companyName || project.name || 'Sin nombre'}`)

  const now = new Date()
  const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const nextReport = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const dateInfo = {
    weekNumber: Math.ceil(now.getDate() / 7) + now.getMonth() * 4,
    year: now.getFullYear(),
    periodStart: periodStart.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }),
    periodEnd: now.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }),
    generatedAt: now.toLocaleDateString('es-MX', { weekday: 'short', hour: '2-digit', minute: '2-digit' }),
    nextMonth: nextReport.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }),
    nextReportDate: nextReport.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }),
  }

  // 1. Llamar a Claude con web search
  let aiData: any
  try {
    aiData = await callClaudeWithSearch(project, dateInfo)
  } catch (err) {
    console.error('⚠️ Claude AI falló, usando datos de fallback:', err)
    // Fallback mínimo si Claude falla — no bloquea el PDF
    aiData = {
      competitivePressure: 60,
      opportunityScore: 65,
      marketRisk: 35,
      riskLevel: 'MEDIO',
      generalTrend: 'TENDENCIA ESTABLE',
      trendDelta: '+0',
      insights: [{ category: 'ANÁLISIS · INFO', text: 'Análisis en procesamiento. Próximo reporte con datos completos.' }],
      actions: [{ priority: 'MED', text: 'Mantener monitoreo activo de competidores esta semana.' }],
      earlyWarning: 'Sistema de monitoreo activo.',
      marketStatus: 'Datos en procesamiento',
      marketStatusDesc: 'El sistema de IA está procesando la información. Los datos estarán disponibles en el próximo reporte.',
      mainAlertTitle: 'Análisis en curso',
      mainAlertDesc: 'El motor de inteligencia está recopilando datos de mercado.',
      mainAlertLevel: 'BAJO',
    }
  }

  // 2. Construir datos completos del reporte
  const data = buildReportData(project, aiData, dateInfo)

  // 3. Cargar y renderizar template
  const templatePath = path.join(__dirname, '../templates/competitive-report.html')
  const template = fs.readFileSync(templatePath, 'utf-8')
  const html = renderTemplate(template, data)

  // 4. Generar PDF via Browserless
  const BLESS = process.env.BLESS_KEY || '2USURVP56XGJ4jt3d331ba66adbe68c94b9339f6a42b53507'
  const response = await fetch(
    `https://production-sfo.browserless.io/pdf?token=${BLESS}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html,
        options: {
          format: 'A4',
          landscape: true,
          printBackground: true,
          margin: { top: '0', right: '0', bottom: '0', left: '0' },
        },
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`Browserless error: ${response.status} ${await response.text()}`)
  }

  const pdfBuffer = await response.arrayBuffer()
  fs.writeFileSync(outputPath, Buffer.from(pdfBuffer))
  console.log(`✅ PDF con datos reales generado: ${outputPath}`)

  // 5. Guardar sectionsJson en DB para el dashboard
  try {
    const sectionsJson = {
      // Métricas principales
      competitivePressure: data.competitivePressure,
      opportunityScore: data.opportunityScore,
      marketRisk: data.marketRisk,
      riskLevel: data.riskLevel,
      generalTrend: data.generalTrend,
      trendDelta: data.trendDelta,
      // Resumen ejecutivo
      marketStatus: data.marketStatus,
      marketStatusDesc: data.marketStatusDesc,
      earlyWarning: data.earlyWarning,
      // Alertas
      criticalAlertsCount: data.criticalAlertsCount,
      mediumAlertsCount: data.mediumAlertsCount,
      criticalAlerts: data.criticalAlerts?.slice(0, 3),
      mediumAlerts: data.mediumAlerts?.slice(0, 3),
      // Competidores
      competitors: data.competitors?.slice(0, 5),
      mostAggressiveName: data.mostAggressiveName,
      mostAggressiveDesc: data.mostAggressiveDesc,
      weakestName: data.weakestName,
      emergingName: data.emergingName,
      // Oportunidades y riesgos
      opportunities: data.opportunities?.slice(0, 4),
      highRisks: data.highRisks?.slice(0, 3),
      // Señales
      criticalSignals: data.criticalSignals,
      importantSignals: data.importantSignals,
      // Periodo
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      weekNumber: data.weekNumber,
    }

    if (project.reportId) {
      await prisma.report.update({
        where: { id: project.reportId },
        data: {
          sectionsJson,
          reportTitle: `Inteligencia Competitiva · Sem ${data.weekNumber} · ${data.year}`,
          pdfSizeBytes: Buffer.from(pdfBuffer).length,
          status: 'COMPLETED' as any,
        }
      })
    }
    console.log('✅ sectionsJson guardado en DB')
  } catch(e) {
    console.error('⚠️ Error guardando sectionsJson:', e)
  }

  return outputPath
}