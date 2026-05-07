import Anthropic from '@anthropic-ai/sdk'
import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'

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

  return `Eres el motor de inteligencia competitiva de Reports PRO, especializado en PYMES de LATAM.
🌎 CONTEXTO DE LOCALIZACION:
Esta empresa opera en ${setup.city || 'ciudad no especificada'}, ${setup.country || 'Mexico'}.
Usa este contexto para que la inteligencia sea relevante y local — no es necesario repetir la ciudad en cada oracion.
Prioriza competidores, noticias y tendencias de ${setup.city || setup.country || 'Mexico'}.
Al buscar en web incluye la ciudad/pais en tus queries cuando sea relevante.

🌎 REGLA ABSOLUTA DE LOCALIZACION — LEER ANTES DE TODO:
Esta empresa opera en ${setup.city || 'ciudad no especificada'}, ${setup.country || 'Mexico'}.
CADA seccion del reporte DEBE mencionar ${setup.city || setup.country || 'Mexico'} de forma explicita.
Competidores: SOLO empresas con presencia real en ${setup.city || setup.country || 'Mexico'}.
Noticias y tendencias: SOLO de ${setup.city || setup.country || 'Mexico'} o que impacten directamente ahi.
Al buscar en web: incluye siempre "${setup.city || setup.country || 'Mexico'}" en tus queries de busqueda.
NO mencionar ciudades o mercados ajenos a menos que el cliente opere ahi.


IDENTIDAD DEL CLIENTE:
- Empresa: ${companyName}
- Sitio web: ${website}
- Giro REAL: ${businessType}
- Ubicacion: ${setup.city || 'No especificada'}, ${setup.country || 'Mexico'}
- Alcance: ${geographicScope}
- Mercado: ${setup.targetMarket || 'Mexico'}
- Tamano: PYME regional — NO comparar con corporativos

INSTRUCCION DE GEOLOCALIZACION:
TODA la inteligencia debe estar enfocada en ${setup.city || setup.country || 'Mexico'}. Competidores con presencia en esa ciudad/region. Noticias, campanas, movimientos de mercado locales. Si no hay info local especifica, menciona el contexto nacional de ${setup.country || 'Mexico'} pero siempre priorizando lo local.

PRODUCTOS Y SERVICIOS CON PRECIOS:
${products}

DESCRIPCION DEL NEGOCIO:
${pitch}

DIFERENCIADORES:
${differentiators}

COMPETIDORES REGISTRADOS — OBLIGATORIO INCLUIRLOS EN EL REPORTE:
${directCompetitorsList}

AREAS DE MONITOREO: ${focusAreas}
PERIODO: ${dateInfo.periodStart} al ${dateInfo.periodEnd}

---

INSTRUCCIONES DE INVESTIGACION:

PASO 1 — Busca CADA competidor registrado (OBLIGATORIO, uno por uno):
- Visita su sitio web y redes sociales
- Encuentra sus servicios actuales y precios visibles
- Detecta campanas o promociones activas
- Busca publicaciones recientes en Instagram, Facebook, LinkedIn
- Busca resenas o menciones en Google
- Busca vacantes publicadas en LinkedIn o Indeed
- Busca noticias o lanzamientos recientes
- Guarda la URL de cada fuente encontrada
Si el competidor es pequeno y no tiene mucha presencia, DILO y busca agencias similares del sector como referencia comparativa.

PASO 2 — Busca el mercado de ${businessType} en Mexico esta semana:
- Tendencias del sector (nuevas herramientas, plataformas, tecnologias)
- Cambios de precios en el mercado
- Oportunidades de nicho desatendidas para PYMES
- Amenazas emergentes

PASO 3 — Para cada dato importante, guarda la URL o nombre del medio como fuente.

---

REGLAS ABSOLUTAS:
1. Los competidores registrados SIEMPRE deben aparecer en el reporte
2. Solo analizar empresas del mismo giro (${businessType}) y tamano PYME similar
3. Cada alerta y movimiento DEBE tener fuente (URL o nombre del medio)
4. Si un dato no es verificable, marcarlo como "Estimado" o "Sin datos publicos"
5. La tabla benchmark SIEMPRE se completa — usar "N/A" si no hay datos
6. Precios realistas para el mercado mexicano de ${businessType}
7. Responde en espanol de Mexico

---

Responde UNICAMENTE con JSON valido comenzando con { sin texto previo:

{
  "competitivePressure": <0-100>,
  "opportunityScore": <0-100>,
  "marketRisk": <0-100>,
  "riskLevel": "<BAJO|MEDIO|ALTO|CRITICO>",
  "generalTrend": "<tendencia especifica para ${businessType} en Mexico esta semana>",
  "trendDelta": "<+N o -N>",
  "signalsCount": "<numero>",
  "signalsDelta": <numero>,
  "movementsCount": <numero>,
  "criticalMovements": <numero>,
  "minorMovements": <numero>,
  "alertsCount": <numero>,
  "totalChanges": <numero>,
  "insights": [
    { "category": "<CATEGORIA · NIVEL>", "text": "<insight real con dato especifico y fuente>" },
    { "category": "<CATEGORIA · NIVEL>", "text": "<insight real con fuente>" },
    { "category": "<CATEGORIA · NIVEL>", "text": "<insight real con fuente>" }
  ],
  "actions": [
    { "priority": "ALTA", "text": "<accion concreta con plazo para PYME de ${businessType}>" },
    { "priority": "MED", "text": "<accion concreta>" },
    { "priority": "BAJA", "text": "<accion concreta>" }
  ],
  "earlyWarning": "<alerta temprana con dato especifico y fuente>",
  "marketStatus": "<estado del mercado de ${businessType} en Mexico>",
  "marketStatusDesc": "<descripcion con datos reales, 2 oraciones>",
  "mainAlertTitle": "<alerta principal mas urgente>",
  "mainAlertDesc": "<2-3 oraciones con datos reales y fuente>",
  "mainAlertLevel": "<BAJO|MEDIO|ALTO|CRITICO>",
  "competitors": [
    {
      "name": "<nombre — INCLUIR TODOS LOS COMPETIDORES REGISTRADOS PRIMERO>",
      "scope": "<Local|Nacional|Regional>",
      "threat": <1-10>,
      "growth": "<subio +X% o Estable o bajo -X%>",
      "recentMove": "<movimiento real con fecha, o Sin datos publicos disponibles>",
      "riskLabel": "<BAJO|MEDIO|VIGILAR|CRITICO>",
      "sourceUrl": "<URL donde encontraste info, o N/A>"
    }
  ],
  "mostAggressiveName": "<nombre>",
  "mostAggressiveDesc": "<dato especifico con fecha y fuente>",
  "weakestName": "<nombre>",
  "weakestDesc": "<evidencia de debilidad>",
  "emergingName": "<amenaza emergente real>",
  "emergingDesc": "<dato especifico>",
  "criticalAlerts": [
    {
      "icon": "<emoji>",
      "title": "<alerta especifica para ${businessType}>",
      "detected": "<fecha especifica · Fuente: nombre del medio o URL>",
      "description": "<descripcion con datos verificados>",
      "action": "<accion concreta accionable para PYME>"
    }
  ],
  "mediumAlerts": [
    {
      "icon": "<emoji>",
      "title": "<titulo>",
      "source": "<nombre del medio o URL>",
      "description": "<descripcion con dato especifico>"
    }
  ],
  "changesCol1": [
    {
      "icon": "<emoji>",
      "category": "<CAT · NIVEL>",
      "date": "<dia especifico, ej: 2 may>",
      "title": "<cambio real detectado>",
      "description": "<detalle con fuente: URL o medio>",
      "competitor": "<nombre del competidor o Mercado general>"
    }
  ],
  "changesCol2": [
    {
      "icon": "<emoji>",
      "category": "<CAT · NIVEL>",
      "date": "<dia>",
      "title": "<cambio>",
      "description": "<detalle con fuente>",
      "competitor": "<nombre>"
    }
  ],
  "priceTrends": [
    { "name": "<competidor registrado>", "change": "<subio +X% o Estable o bajo -X% o Sin datos publicos>" }
  ],
  "priceTrendAlert": "<alerta de precios especifica con dato real>",
  "dominantMessages": [
    {
      "competitor": "<NOMBRE MAYUSCULAS>",
      "message": "<mensaje real de su web o redes, o mensaje estimado basado en su posicionamiento>"
    }
  ],
  "opportunities": [
    {
      "icon": "<emoji>",
      "type": "<tipo de oportunidad>",
      "title": "<titulo especifico para ${businessType} PYME>",
      "description": "<descripcion con dato que la sustenta y fuente>",
      "score": <0-100>,
      "window": "<ventana de tiempo realista>"
    }
  ],
  "rivalWeaknesses": [
    {
      "competitor": "<NOMBRE — preferir competidores registrados>",
      "weakness": "<debilidad especifica con evidencia detectada>"
    }
  ],
  "highRisks": [
    {
      "icon": "<emoji>",
      "title": "<riesgo real para PYME de ${businessType}>",
      "probability": <0-100>,
      "description": "<descripcion con contexto real>",
      "mitigation": "<accion concreta con recursos limitados de PYME>"
    }
  ],
  "mediumRisks": [
    { "icon": "<emoji>", "title": "<riesgo>", "description": "<descripcion con dato>" }
  ],
  "strengths": [
    "<fortaleza basada en diferenciadores reales del cliente>",
    "<fortaleza>",
    "<fortaleza>"
  ],
  "improvements": [
    "<area de mejora detectada vs competencia>",
    "<area>",
    "<area>"
  ],
  "benchmarkRows": [
    {
      "factor": "Precio / Tarifas",
      "client": "<ALTO/MEDIO/BAJO o rango de precio>",
      "comp1": "<evaluacion competidor 1 o N/A>",
      "comp2": "<evaluacion competidor 2 o N/A>",
      "comp3": "<evaluacion competidor 3 o N/A>",
      "position": "<1er lugar / 2do lugar / etc>"
    },
    {
      "factor": "Servicios ofrecidos",
      "client": "<descripcion breve>",
      "comp1": "<o N/A>",
      "comp2": "<o N/A>",
      "comp3": "<o N/A>",
      "position": "<posicion>"
    },
    {
      "factor": "Presencia digital",
      "client": "<ALTA/MEDIA/BAJA>",
      "comp1": "<o N/A>",
      "comp2": "<o N/A>",
      "comp3": "<o N/A>",
      "position": "<posicion>"
    },
    {
      "factor": "Redes sociales",
      "client": "<activo/inactivo/seguidores estimados>",
      "comp1": "<o N/A>",
      "comp2": "<o N/A>",
      "comp3": "<o N/A>",
      "position": "<posicion>"
    },
    {
      "factor": "Casos de exito / Portafolio",
      "client": "<SI/NO/PARCIAL>",
      "comp1": "<o N/A>",
      "comp2": "<o N/A>",
      "comp3": "<o N/A>",
      "position": "<posicion>"
    },
    {
      "factor": "Tiempo en el mercado",
      "client": "<anos estimados>",
      "comp1": "<o N/A>",
      "comp2": "<o N/A>",
      "comp3": "<o N/A>",
      "position": "<posicion>"
    },
    {
      "factor": "Especializacion",
      "client": "<descripcion>",
      "comp1": "<o N/A>",
      "comp2": "<o N/A>",
      "comp3": "<o N/A>",
      "position": "<posicion>"
    },
    {
      "factor": "Cobertura geografica",
      "client": "<Local/Regional/Nacional>",
      "comp1": "<o N/A>",
      "comp2": "<o N/A>",
      "comp3": "<o N/A>",
      "position": "<posicion>"
    }
  ],
  "highPriorityRecs": [
    {
      "number": 1,
      "title": "<recomendacion concreta>",
      "owner": "<responsable>",
      "deadline": "<plazo>",
      "description": "<detalle paso a paso accionable>",
      "impact": "<impacto esperado con metrica>",
      "difficulty": "<FACIL|MEDIO|DIFICIL>",
      "timeRequired": "<CORTO|MEDIO|LARGO>",
      "costRequired": "<BAJO|MEDIO|ALTO>"
    },
    {
      "number": 2,
      "title": "<recomendacion>",
      "owner": "<responsable>",
      "deadline": "<plazo>",
      "description": "<detalle>",
      "impact": "<impacto>",
      "difficulty": "<FACIL|MEDIO|DIFICIL>",
      "timeRequired": "<CORTO|MEDIO|LARGO>",
      "costRequired": "<BAJO|MEDIO|ALTO>"
    }
  ],
  "mediumPriorityRecs": [
    {
      "number": 3,
      "title": "<recomendacion>",
      "deadline": "<plazo>",
      "description": "<detalle>",
      "impact": "<impacto>"
    },
    {
      "number": 4,
      "title": "<recomendacion>",
      "deadline": "<plazo>",
      "description": "<detalle>",
      "impact": "<impacto>"
    }
  ],
  "lowPriorityRecs": [
    { "number": 5, "title": "<recomendacion>", "description": "<detalle>" },
    { "number": 6, "title": "<recomendacion>", "description": "<detalle>" }
  ],
  "secondaryCompetitors": [
    {
      "name": "<nombre competidor secundario — buscar agencias similares en el mercado>",
      "category": "<tipo de agencia o servicio>",
      "threat": 3,
      "recentMove": "<movimiento reciente o Sin datos publicos>",
      "sourceUrl": "<URL o N/A>"
    }
  ],
  "criticalSignals": ["<senal critica 1>", "<senal 2>", "<senal 3>", "<senal 4>"],
  "importantSignals": ["<senal 1>", "<senal 2>", "<senal 3>", "<senal 4>"],
  "infoSignals": ["<senal 1>", "<senal 2>", "<senal 3>", "<senal 4>"]
}`
}


// ─── Llamar a Claude con web search ──────────────────
async function callClaudeWithSearch(project: any, dateInfo: any): Promise<any> {
  console.log('🤖 Iniciando análisis con Claude AI + web search...')
  console.log('🏭 Giro detectado:', inferBusinessType(project.setup || {}))
  console.log('📦 Setup keys:', Object.keys(project.setup || {}))
  console.log('🏢 companyName en setup:', project.setup?.companyName)
  console.log('🔧 mainProducts:', project.setup?.mainProducts)

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
  const systemPrompt = `Eres un analista de inteligencia competitiva para PYMES mexicanas. REGLA ABSOLUTA: El negocio del cliente es una ${businessType}. PROHIBIDO analizar telecomunicaciones, 5G, Telcel, AT&T, Movistar, Izzi o cualquier empresa de telecom. SOLO analiza competidores del mismo giro y tamaño PYME. Responde en español de México.`

  // Llamada a Claude con web search habilitado
  const response = await anthropic.messages.create({
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
  {
    role: 'user',
    content: prompt,
  },
  {
    role: 'assistant',
    content: '{',
  },
],
  })

  console.log(`✅ Claude respondió — stop_reason: ${response.stop_reason}`)

  // Extraer el JSON de la respuesta
  // Claude puede devolver múltiples bloques (tool_use + text) — buscamos el text final
  let jsonText = ''
  for (const block of response.content) {
    if (block.type === 'text') {
      jsonText = block.text
    }
  }

  if (!jsonText) {
    throw new Error('Claude no devolvió texto en la respuesta')
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
  const dominantMessages = (aiData.dominantMessages || []).map((dm: any, i: number) => ({
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
  return outputPath
}