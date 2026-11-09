// Prompt v1 del reporte de inteligencia competitiva — copia literal del `buildPrompt` original de
// reportEngine.ts, conservada para poder revertir (ver ACTIVE_PROMPT_VERSION en ./index.ts).
// NO modificar el contenido: cualquier mejora va en competitivePromptV2.ts.
import { inferBusinessType, extractSetupContext } from './promptContext'

// ─── Prompt para Claude (v1) ─────────────────────────
export function buildCompetitivePromptV1(project: any, dateInfo: any): string {
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
• Presencia de Mercado (tabla benchmark): NUNCA años ni antigüedad estimada. Usa solo esta escala, por lo observable en la web:
  Alta = referente del giro en la zona: aparece en varias búsquedas genéricas del sector, con sucursales o cobertura amplia y menciones en medios o directorios.
  Media = establecida: sitio activo, aparece en algunas búsquedas o directorios del sector.
  Mínima = rastro escaso: solo un sitio o perfil propio, sin menciones externas.
  Nula = sin rastro público detectable.
• secondaryCompetitors DEBE incluir SIEMPRE un mínimo de 3 elementos. Si el cliente no registró suficientes competidores indirectos, investiga y agrega competidores adicionales reales del mismo sector/industria (${setup.industry || 'la industria del cliente'}) en ${setup.city || setup.country || 'México'} mediante búsqueda web. Solo si después de buscar genuinamente no encuentras NINGÚN competidor adicional verificable, usa exactamente este valor para cada campo de texto: "No se encontraron datos" — pero esto debe ser la excepción, no la regla.

REGLAS DE CANALES DE VENTA (newChannels):
• Recomienda exactamente 3 canales de venta/adquisición REALES y relevantes para ${businessType} en ${setup.industry || 'la industria del cliente'}
• Varía las recomendaciones según lo que detectes en el mercado y la competencia — NO uses siempre las mismas 3 opciones genéricas. Considera el abanico completo: WhatsApp Business API, LinkedIn Ads B2B, Programmatic Display, Google Shopping, Marketplace especializado del sector, Email marketing automatizado, Partnerships/Alianzas estratégicas, Eventos y ferias del sector, Referidos B2B, TikTok Ads, Influencer marketing de nicho, SEO local, Telemarketing dirigido, etc. — elige las 3 que mejor encajen con lo observado en este reporte específico
• Cada canal DEBE incluir el campo "reason" con un argumento concreto y específico de por qué conviene implementarlo ahora (basado en una señal real detectada en el mercado o la competencia, no genérico)

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

Posicionamiento en buscadores — ejecutar POR CADA entidad (cliente + cada competidor directo registrado):
  → "[nombre de la entidad]" — ¿aparece en resultados? ¿con qué dominio?
  → "site:[dominio de la entidad, si se conoce]" — ¿está indexado? ¿aproximadamente cuántas páginas?
  → "${businessType} ${setup.city || setup.country || 'México'}" — ¿aparece esta entidad en estos resultados?
REGISTRA para cada entidad, y NADA MÁS que esto:
  a) las queries exactas que ejecutaste para esa entidad
  b) si la entidad apareció o no en los resultados de cada query
  c) el dominio que apareció, si alguno
PROHIBIDO derivar de esto un número de posición en Google — reporta presencia/ausencia por query, nunca una posición inferida.

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
• La fidelidad de la información es prioridad absoluta — cada dato debe tener fuente y frescura
• Incluir todos los competidores directos registrados
• Cada alerta y movimiento debe tener fuente (URL, medio, o "Estimado")
• Precios realistas para el mercado mexicano de ${businessType}
• Acciones concretas y accionables para PYME con recursos limitados
• Benchmark con los primeros 5 competidores directos en tabla
• Indicar frescura de cada dato según la Regla de Frescura
• Mínimo 10 búsquedas web antes de estructurar la respuesta
• Recomendaciones variadas — categorías a usar esta semana: ${selectedCategories}
• Validación y Revisión exhaustiva de cada dato antes de incluirlo en el reporte, principalmente posicionamiento SEO, precios, campañas activas, vacantes y reseñas de competidores y toda información que sea facilmente verificable en web. No incluir datos sin haberlos verificado primero.

✗ NUNCA HACER:
• Inventar movimientos, precios o campañas de competidores
• Presentar datos de hace más de 30 días como información actual
• Analizar telecomunicaciones, banca, o corporativos globales
• Recomendar acciones con presupuesto de corporativo (>$50,000 MXN sin justificación)
• Repetir la misma recomendación o categoría dos veces en el mismo reporte
• Usar anglicismos innecesarios — español de México siempre
• Dejar campos vacíos — si no hay datos: "Sin datos públicos disponibles"
• Dar recomendaciones genéricas como "mejorar redes sociales" sin especificidad
• Declarar una posición numérica de Google (#3, #7, "top 5") como dato duro. La herramienta de búsqueda NO devuelve posiciones de SERP reales. Solo puedes afirmar presencia o ausencia en resultados basándote en una búsqueda que realmente ejecutaste para esa entidad. Si no ejecutaste la búsqueda, escribe "Sin verificar" — es preferible una celda "Sin verificar" a una posición inventada, porque el cliente puede comprobar su propio posicionamiento en segundos y una cifra incorrecta destruye la credibilidad de todo el reporte.

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

━━━ RÚBRICAS DE EVALUACIÓN ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Las métricas globales del reporte (presión, oportunidad, riesgo, señales, movimientos) las CALCULA el
sistema a partir de tu evidencia. NO las inventes: solo evalúa cada elemento con estas rúbricas y sé
honesto con el nivel. Usa todo el rango; no repitas valores "típicos" entre elementos sin justificación.

RÚBRICA DE AMENAZA (threat 1-10, por competidor):
- 9-10: compite directo por los mismos clientes y tuvo un movimiento verificado esta semana (precio, campaña, expansión, alianza).
- 7-8: competidor directo fuerte, con actividad reciente (último mes) o ventaja clara sobre el cliente.
- 5-6: competidor relevante sin movimientos verificados en el periodo.
- 3-4: competencia parcial (otro segmento, otra zona) o poca presencia.
- 1-2: marginal o sin presencia digital detectable.

RÚBRICA DE OPORTUNIDAD (score 0-100, por oportunidad):
- 85-100: el cliente puede ejecutarla esta semana con recursos propios y hay evidencia directa de demanda.
- 65-84: ejecutable en el mes con inversión baja; evidencia indirecta.
- 40-64: requiere inversión o capacidades que el cliente aún no tiene.
- 0-39: especulativa o con evidencia débil.

RÚBRICA DE IMPACTO (impact 1-10, por riesgo alto):
- 9-10: puede costar clientes clave o más del 20% de los ingresos.
- 6-8: afecta márgenes o captación de forma notable (5-20%).
- 3-5: molestia operativa o pérdida menor (<5%).
- 1-2: impacto marginal.

NIVEL de cada cambio ("CAT · NIVEL"): CRÍTICO = cambia las reglas del mercado o ataca directamente al cliente;
ALTO = movimiento relevante de un competidor directo; MEDIO = señal a vigilar; BAJO = informativo.
Porcentajes de crecimiento ("+X%") SOLO si hay fuente verificable; si no, usa "→ Sin cambios verificables".

━━━ ESTRUCTURA DE RESPUESTA JSON ━━━━━━━━━━━━━━━━━━━━━━━━━━

Responde ÚNICAMENTE con JSON válido comenzando con { sin texto previo ni markdown:

{
  "generalTrend": "<tendencia específica y concreta para ${businessType} en ${setup.country || 'México'} esta semana>",

  "clientScore": {
    "overall": <0-100, promedio ponderado>,
    "price": <0-100>,
    "digital": <0-100>,
    "differentiation": <0-100>,
    "speed": <0-100>,
    "vsCompetitors": "<Por encima del promedio|En el promedio|Por debajo del promedio>",
    "strongAreas": ["<fortaleza concreta detectada>", "<fortaleza 2>"],
    "weakAreas": ["<área de mejora concreta>", "<área 2>"],
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
      "threat": <1-10 según la RÚBRICA DE AMENAZA>,
      "growth": "<↑ subió +X% · [fuente] | → Estable | ↓ bajó -X% · [fuente] | → Sin cambios verificables>",
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
  "priceTrendAlert": "<resumen de UNA sola línea, máximo 18 palabras, con el dato de precio más relevante y su impacto — sin fuente ni fecha, directo al punto>",

  "dominantMessages": [
    { "competitor": "<NOMBRE EN MAYÚSCULAS>", "message": "<mensaje real de su web o redes, o estimado basado en posicionamiento visible>" },
    { "competitor": "<NOMBRE>", "message": "<mensaje>" },
    { "competitor": "<NOMBRE>", "message": "<mensaje>" }
  ],

  "newChannels": [
    {
      "icon": "<emoji representativo del canal>",
      "channel": "<nombre del canal de venta o adquisición recomendado para ${businessType} en ${setup.industry || 'esta industria'}>",
      "desc": "<para qué sirve este canal en una frase corta>",
      "reason": "<argumento concreto de por qué conviene implementarlo ahora, basado en lo que estás viendo de la competencia o el mercado>"
    }
  ],
  "rivalAdvantages": [
    { "icon": "<emoji>", "text": "<ventaja visible y concreta del rival líder, con evidencia>", "bg": "#FCEBEB", "border": "#F7C1C1", "textColor": "#A32D2D" },
    { "icon": "<emoji>", "text": "<segunda ventaja del rival líder>", "bg": "#FCEBEB", "border": "#F7C1C1", "textColor": "#A32D2D" },
    { "icon": "✅", "text": "<la ventaja propia del cliente frente a ese rival>", "bg": "#EAF3DE", "border": "#C0DD97", "textColor": "#27500A" }
  ],
  "rivalLeaderName": "<nombre del competidor con mayor amenaza/posición #1 en el ranking>",

  "opportunities": [
    {
      "icon": "<emoji>",
      "type": "<tipo de oportunidad específica>",
      "title": "<título concreto para ${businessType} PYME>",
      "description": "<descripción con el dato que la sustenta y la fuente>",
      "score": <0-100 según la RÚBRICA DE OPORTUNIDAD>,
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
      "probability": <0-100, probabilidad de que ocurra en los próximos 90 días>,
      "impact": <1-10 según la RÚBRICA DE IMPACTO>,
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
    "<fortaleza 3>",
    "<fortaleza 4>",
    "<fortaleza 5>"
  ],
  "improvements": [
    "<área de mejora 1 — detectada comparando cliente vs competidores>",
    "<área 2>",
    "<área 3>",
    "<área 4>",
    "<área 5>"
  ],

  "benchmarkRows": [
    { "factor": "Precio / Tarifas", "client": "<ALTO/MEDIO/BAJO o rango MXN>", "comp1": "<o N/A>", "comp2": "<o N/A>", "comp3": "<o N/A>", "comp4": "<o N/A>", "comp5": "<o N/A>", "position": "<1er lugar | 2do lugar | etc>" },
    { "factor": "Servicios ofrecidos", "client": "<descripción breve>", "comp1": "<o N/A>", "comp2": "<o N/A>", "comp3": "<o N/A>", "comp4": "<o N/A>", "comp5": "<o N/A>", "position": "<posición>" },
    { "factor": "Presencia digital", "client": "<ALTA/MEDIA/BAJA>", "comp1": "<o N/A>", "comp2": "<o N/A>", "comp3": "<o N/A>", "comp4": "<o N/A>", "comp5": "<o N/A>", "position": "<posición>" },
    { "factor": "Redes sociales", "client": "<plataforma activa · frecuencia>", "comp1": "<o N/A>", "comp2": "<o N/A>", "comp3": "<o N/A>", "comp4": "<o N/A>", "comp5": "<o N/A>", "position": "<posición>" },
    { "factor": "SEO / Posicionamiento Google", "client": "<Top 3 orgánico | Top 10 orgánico | Aparece en resultados | No aparece | Sin verificar>", "comp1": "<mismo formato o 'Sin verificar'>", "comp2": "<mismo formato o 'Sin verificar'>", "comp3": "<mismo formato o 'Sin verificar'>", "comp4": "<mismo formato o 'Sin verificar'>", "comp5": "<mismo formato o 'Sin verificar'>", "position": "<posición>" },
    { "factor": "Casos de éxito / Portafolio", "client": "<SÍ visible|NO visible|PARCIAL>", "comp1": "<o N/A>", "comp2": "<o N/A>", "comp3": "<o N/A>", "comp4": "<o N/A>", "comp5": "<o N/A>", "position": "<posición>" },
    { "factor": "Presencia de Mercado", "client": "<Nula | Mínima | Media | Alta>", "comp1": "<Nula | Mínima | Media | Alta>", "comp2": "<misma escala>", "comp3": "<misma escala>", "comp4": "<misma escala>", "comp5": "<misma escala>", "position": "<posición>" },
    { "factor": "Especialización", "client": "<descripción breve>", "comp1": "<o N/A>", "comp2": "<o N/A>", "comp3": "<o N/A>", "comp4": "<o N/A>", "comp5": "<o N/A>", "position": "<posición>" },
    { "factor": "Cobertura geográfica", "client": "<Local/Regional/Nacional>", "comp1": "<o N/A>", "comp2": "<o N/A>", "comp3": "<o N/A>", "comp4": "<o N/A>", "comp5": "<o N/A>", "position": "<posición>" }
  ],

  "secondaryCompetitors": [
    {
      "name": "<nombre del competidor adicional — del 6 al 10>",
      "category": "<tipo de empresa o servicio>",
      "threat": <1-10 según la RÚBRICA DE AMENAZA>,
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
