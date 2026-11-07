// Prompt v2 del reporte de inteligencia competitiva.
//
// Diferencias con v1 (competitivePromptV1.ts), que se conserva literal para revertir:
// - Cada número que escribe la IA (threat, nivel de cambio, score de oportunidad, probability, impact) se
//   descompone en factores observables con puntos y lleva una justificación de una oración (*Basis) que
//   cita la evidencia y su fuente. Las métricas globales las sigue calculando reportScoring.ts.
// - Niveles de evidencia (E3/E2/E1/E0) y calibración explícita: probabilidad >80 solo con hecho confirmado
//   y fechado; sin evidencia el elemento no se incluye o se puntúa bajo.
// - Los tamaños de lista son máximos, no metas: solo entran hallazgos con evidencia (el sistema los cuenta).
// - Sin valores de ejemplo en los marcadores del esquema JSON (evitan anclar "números típicos").
// El conjunto de campos JSON, su tipo y forma son los mismos que en v1; los *Basis son campos adicionales
// que las plantillas no renderizan.
import { inferBusinessType, extractSetupContext, registeredDirectCompetitors } from './promptContext'

// ─── Prompt para Claude (v2) ─────────────────────────
export function buildCompetitivePromptV2(project: any, dateInfo: any): string {
  const setup = project.setup || {}
  const businessType = inferBusinessType(setup)
  const { products, indirectComps, differentiators, pitch } = extractSetupContext(setup)
  const focusAreas = (setup.focusAreas || []).join(', ') || 'precios, campanas, lanzamientos'
  const geographicScope = (setup.geographicScope || ['MX']).join(', ')
  const companyName = setup.companyName || project.companyName || project.name
  const website = setup.website || ''
  const city = setup.city || setup.country || 'México'
  const country = setup.country || 'México'
  const industry = setup.industry || 'la industria del cliente'

  const directCompetitorsList = registeredDirectCompetitors(setup)
    .map(c => `- ${c.name} | URL: ${c.url || 'N/A'}${c.products ? ` | Servicios: ${c.products}` : ''}`)
    .join('\n') || 'No especificados'

  const now = new Date()
  const fechaExacta = now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const horaGeneracion = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  const mesActual = now.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })

  // Categorías de recomendación para forzar variedad (misma rotación semanal que v1)
  const recCategories = [
    'MARKETING DIGITAL', 'VENTAS Y CONVERSIÓN', 'PRODUCTO O SERVICIO',
    'OPERACIONES', 'TALENTO Y EQUIPO', 'FIDELIZACIÓN DE CLIENTES',
    'POSICIONAMIENTO Y MARCA', 'NUEVOS CANALES', 'TECNOLOGÍA Y HERRAMIENTAS',
    'ALIANZAS ESTRATÉGICAS', 'CONTENIDO Y COMUNICACIÓN', 'PRECIO Y PROPUESTA DE VALOR'
  ]
  const weekSeed = Math.ceil(now.getDate() / 7) + now.getMonth() * 4
  const shuffledCats = [...recCategories].sort(() => Math.sin(weekSeed + recCategories.indexOf(recCategories[0])) - 0.5)
  const selectedCategories = shuffledCats.slice(0, 6).join(', ')

  return `
═══════════════════════════════════════════════════════════════
REPORTE DE INTELIGENCIA COMPETITIVA — Reports PRO v2.1
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
Ubicación: ${setup.city || 'No especificada'}, ${country}
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
Esta empresa opera en ${setup.city || 'ciudad no especificada'}, ${country}.
• TODA la inteligencia debe ser relevante para ${city}
• Competidores: SOLO empresas con presencia real en ${city}
• Noticias y tendencias: SOLO de ${city} o que impacten directamente ahí
• Al buscar en web: incluye siempre "${city}" en tus queries
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
• secondaryCompetitors DEBE incluir SIEMPRE un mínimo de 3 elementos. Si el cliente no registró suficientes competidores indirectos, investiga y agrega competidores adicionales reales del mismo sector/industria (${industry}) en ${city} mediante búsqueda web. Solo si después de buscar genuinamente no encuentras NINGÚN competidor adicional verificable, usa exactamente este valor para cada campo de texto: "No se encontraron datos" — pero esto debe ser la excepción, no la regla.

REGLAS DE CANALES DE VENTA (newChannels):
• Recomienda exactamente 3 canales de venta/adquisición REALES y relevantes para ${businessType} en ${industry}
• Varía las recomendaciones según lo que detectes en el mercado y la competencia — NO uses siempre las mismas 3 opciones genéricas. Considera el abanico completo: WhatsApp Business API, LinkedIn Ads B2B, Programmatic Display, Google Shopping, Marketplace especializado del sector, Email marketing automatizado, Partnerships/Alianzas estratégicas, Eventos y ferias del sector, Referidos B2B, TikTok Ads, Influencer marketing de nicho, SEO local, Telemarketing dirigido, etc. — elige las 3 que mejor encajen con lo observado en este reporte específico
• Cada canal DEBE incluir el campo "reason" con un argumento concreto y específico de por qué conviene implementarlo ahora (basado en una señal real detectada en el mercado o la competencia, no genérico)

━━━ ÁREAS DE MONITOREO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${focusAreas}

━━━ FASE 1 — INVESTIGACIÓN OBLIGATORIA (mínimo 10 búsquedas) ━━
Ejecuta TODAS estas búsquedas antes de estructurar la respuesta:

Por cada competidor directo registrado:
  → "[nombre competidor] ${city} ${mesActual}"
  → "[nombre competidor] precios servicios ${now.getFullYear()}"
  → "[nombre competidor] instagram linkedin noticias ${now.getFullYear()}"
  Detecta: nuevos servicios, cambios de precio, campañas activas, vacantes, reseñas

Tendencias del sector:
  → "${businessType} México tendencias ${mesActual}"
  → "${businessType} ${city} noticias ${mesActual}"
  Detecta: nuevas tecnologías, cambios regulatorios, oportunidades de nicho

Posicionamiento en buscadores — ejecutar POR CADA entidad (cliente + cada competidor directo registrado):
  → "[nombre de la entidad]" — ¿aparece en resultados? ¿con qué dominio?
  → "site:[dominio de la entidad, si se conoce]" — ¿está indexado? ¿aproximadamente cuántas páginas?
  → "${businessType} ${city}" — ¿aparece esta entidad en estos resultados?
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
Promedio ponderado = clientScore.overall. Cada dimensión se sustenta en lo observado en FASE 1 (presencia
por query, precios encontrados, frecuencia de publicación); si una dimensión no tiene observaciones, puntúala
en el tercio bajo y dilo en summary.

━━━ FASE 4 — EVALUACIÓN BASADA EN EVIDENCIA (lee completo) ━━━
Las métricas globales del reporte (presión competitiva, oportunidad, riesgo, señales, movimientos) las CALCULA
el sistema a partir de los elementos que entregas y sus valores. Por eso cada número tuyo tiene dos reglas:
(1) sale de la rúbrica de factores de abajo, sumando puntos por evidencia observada, nunca por intuición; y
(2) va acompañado de su justificación en el campo *Basis correspondiente: UNA oración que empieza con el
nivel de evidencia y cita el hecho, la fecha y la fuente que suman los puntos.

NIVELES DE EVIDENCIA (prefijo obligatorio de cada *Basis):
• E3 — Confirmado: lo viste en una fuente verificable (URL, medio, boletín oficial) con fecha dentro de los
  últimos 30 días. Es la única base para los valores altos.
• E2 — Anunciado/reportado: declarado por el competidor o un medio confiable, con fecha futura o sin fecha
  exacta de ejecución; o dato de 31-90 días.
• E1 — Tendencia: evidencia indirecta o sectorial (reportes de industria, patrón en varias fuentes), no
  específica del competidor o del cliente.
• E0 — Inferencia: sin fuente. Un elemento E0 NO se incluye en alertas, cambios, riesgos altos ni
  oportunidades; los competidores registrados sí aparecen, con "Sin datos públicos disponibles" y puntaje bajo.
Marca la frescura del dato igual que en la Regla de Frescura.

RÚBRICA DE AMENAZA (competitors[].threat y secondaryCompetitors[].threat, entero 1-10):
Parte de 1 y suma puntos por factor; el máximo es 10.
  a) Traslape directo con el cliente: mismos servicios Y mismo segmento/zona +3 · traslape parcial +2 ·
     servicios o zona distintos +1 · sin traslape 0
  b) Movimiento verificado: E3 de esta semana que afecta al cliente +3 · E3/E2 del último mes +2 ·
     E1 o referencia de >30 días +1 · sin movimiento 0
  c) Fuerza relativa frente a la PYME cliente: mucho mayor en cobertura, flota, precio o marca +2 ·
     comparable +1 · menor 0
  d) Presencia digital activa (publica semanal o más, aparece en las búsquedas de FASE 1) +1 · si no, 0
Entrega cada factor en threatFactors {overlap: a, move: b, strength: c, digital: d}. EL SISTEMA SUMA:
threat = 1 + a + b + c + d (máximo 10) y deriva riskLabel (CRÍTICO solo con 9-10 y b=3; VIGILAR 7-8;
MEDIO 5-6; BAJO 1-4). No hay ajustes fuera de los factores: el total que escribas en threat se reemplaza.
threatBasis: "E? · a+b+c+d: [hecho con fecha y fuente de cada factor]".

RÚBRICA DE ALERTAS (criticalAlerts lleva "level": CRÍTICA o ALTA; mediumAlerts son las de vigilancia):
• CRÍTICA: hecho E3/E2 de los últimos 30 días que YA afecta o afectará en semanas a los clientes, precios,
  ingresos, permisos u operación del cliente (ej. competidor directo baja tarifas en sus rutas/servicios,
  regulación con fecha de entrada, pérdida de un canal o proveedor clave, campaña dirigida a sus clientes).
  También es CRÍTICA un área de oportunidad propia con impacto directo en el rendimiento del negocio o en
  su presencia digital (ausencia en Google, redes inactivas, sin tienda en el canal donde compran sus clientes)
  cuando cerrarla le da ventaja frente a competidores que ya ocupan ese espacio.
• ALTA (umbral de urgencia): hecho E3/E2 que todavía no golpea directamente al cliente pero exige actuar
  este mes: movimiento verificado de un competidor directo con threat ≥ 7 (expansión, contratación masiva,
  nueva oferta en su segmento o zona), cambio de nivel ALTO, o debilidad del cliente que un rival ya
  está explotando con evidencia.
• MEDIA (mediumAlerts): señal o tendencia E1/E2 a vigilar, sin acción urgente.
Coherencia obligatoria: todo competidor con riskLabel CRÍTICO y todo cambio CRÍTICO deben aparecer como
alerta CRÍTICA; todo cambio ALTO de un competidor directo debe aparecer como alerta ALTA o CRÍTICA.
El sistema lo verifica: si falta la alerta, la crea a partir del cambio con una acción genérica, así que
redáctala tú (con el nombre del competidor en el título) para que lleve una acción concreta.
Ordena criticalAlerts con las CRÍTICAS primero. Solo puede quedar vacía si no hay ningún hecho E2+ que
cumpla CRÍTICA o ALTA. No subas una MEDIA a ALTA para llenar la sección.

RÚBRICA DE NIVEL DE CAMBIO (changesCol1/changesCol2 — "CAT · NIVEL"):
• CRÍTICO: hecho E3 que cambia las reglas del mercado del cliente o lo ataca directamente (precio en su
  mismo segmento/ruta, campaña dirigida a sus clientes, regulación con sanción o plazo en menos de 90 días).
• ALTO: movimiento E3/E2 relevante de un competidor directo, sin ataque directo al cliente.
• MEDIO: señal sectorial E2/E1 a vigilar.
• BAJO: informativo.
levelBasis: "E? · [por qué ese nivel y no el siguiente, con fuente]". Los cambios E0 no se incluyen.
Porcentajes de crecimiento ("+X%") SOLO si hay fuente verificable; si no, "→ Sin cambios verificables".

RÚBRICA DE OPORTUNIDAD (opportunities[].score, entero 0-100 = suma de cuatro componentes):
  a) Evidencia de demanda: E3 directa (búsquedas, licitación, cliente que lo pide, hueco documentado) 40 ·
     E2 25 · E1 10 · sin evidencia 0
  b) Factibilidad para ${companyName}: ejecutable esta semana con recursos propios 30 · en el mes con
     inversión baja (<$20,000 MXN) 20 · requiere capacidades o inversión que aún no tiene 5
  c) Hueco competitivo: ningún competidor directo la cubre 20 · pocos la cubren 10 · saturada 0
  d) Ventana: se cierra en menos de 30 días 10 · dentro del trimestre 5 · sin urgencia 0
Entrega cada componente en scoreFactors {demand: a, feasibility: b, gap: c, window: d}, usando solo los
valores de la rúbrica. EL SISTEMA SUMA score = a+b+c+d; con a < 40 el máximo es 84.
scoreBasis: "E? · a+b+c+d: [evidencia y fuente de cada componente]".

RÚBRICA DE PROBABILIDAD (highRisks[].probability, entero 0-100, horizonte 90 días):
Mide la probabilidad de que el DAÑO AL CLIENTE ocurra en 90 días, no de que exista el evento. Separa
evento y consecuencia: que un competidor tenga un descuento activo es E3; que el cliente pierda clientes
por ello es una consecuencia que debes estimar y justificar aparte.
  • 90-100: el daño ya ocurre o está confirmado con fecha dentro de la ventana (regulación ya vigente que
    afecta al cliente, campaña activa Y evidencia de clientes perdidos). Solo con E3 citado.
  • 70-89: anunciado o programado con fecha dentro de los 90 días por fuente oficial o del competidor (E3/E2).
  • 45-69: tendencia clara con evidencia pero sin fecha ni confirmación de impacto en el cliente (E2/E1).
  • 20-44: plausible, con evidencia indirecta.
  • <20: especulativo → NO va en highRisks; si merece seguimiento, va en mediumRisks sin número.
Un riesgo alto es un evento externo o un plazo dentro de los 90 días. Una debilidad estructural del cliente
(por ejemplo, poca visibilidad digital) va en improvements/weakAreas, no en highRisks, salvo que exista un
detonante fechado. Si no puedes citar evidencia E2 o superior, el riesgo no entra en highRisks.
Cada highRisk lleva origin: "EXTERNO" (lo provoca un competidor, el mercado o la regulación) o "PROPIO"
(debilidad del cliente). El sistema excluye los PROPIOS del riesgo de mercado y los muestra como área de mejora;
si afectan directamente el rendimiento del negocio (impact ≥ 6) o la presencia digital, los lista como CRÍTICOS.
probabilityBasis: "E? · [evento, fecha, fuente, y por qué esa banda y no la superior]".

RÚBRICA DE IMPACTO (highRisks[].impact, entero 1-10, anclado a ingresos y clientes de ${companyName}):
  • 9-10: pérdida de clientes clave, de más del 20% de los ingresos o de la capacidad de operar (permisos).
  • 6-8: afecta márgenes o captación de forma notable (5-20% de ingresos).
  • 3-5: molestia operativa o pérdida menor (<5%).
  • 1-2: marginal.
impactBasis: "[qué línea de servicio, ruta, segmento o clientes se afectan y por qué esa banda]". Probabilidad
e impacto altos a la vez solo si AMBOS están evidenciados por separado.

REGLAS DE CALIBRACIÓN (revisar antes de escribir el JSON):
• Para cada número pregúntate qué hecho suma esos puntos. Si la única base es "es lo habitual en el sector",
  baja el valor o quita el elemento.
• El valor final ES la suma de los factores de la rúbrica y la calcula el sistema. No existen ajustes
  ("+1 por marca", "+10 por urgencia"); si un factor merece más puntos, cámbialo en el factor y explícalo.
• Prohibido reutilizar cifras de otros reportes, sectores o semanas. Dos elementos con el mismo número
  deben tener bases distintas que lo expliquen.
• Usa todo el rango de cada escala cuando la evidencia lo justifique; una semana tranquila produce
  valores bajos y pocas alertas, y eso es correcto.
• Los números deben ser coherentes entre sí: el competidor con mayor threat es rivalLeaderName;
  mainAlertLevel no puede ser CRÍTICO si ningún cambio ni alerta es CRÍTICO; el riesgo de mayor
  probabilidad × impacto debe aparecer en earlyWarning o en mainAlertTitle.

━━━ AUTOVERIFICACIÓN OBLIGATORIA ANTES DEL JSON ━━━━━━━━━━━━━
El sistema valida cada punto de esta lista con el prefijo E0-E3 de los *Basis y corrige lo que no cumpla, así
que un valor fuera de regla no sube el resultado: solo deja un ajuste registrado contra tu evaluación.
Revisa uno por uno:
□ Cada *Basis empieza con E3, E2, E1 o E0 (sin prefijo = sin evidencia).
□ threatFactors.move: 3 solo con E3 de esta semana · 2 con E2/E3 del último mes · 1 con E1 · 0 sin movimiento.
□ scoreFactors: demand 40 solo con E3 · 25 con E2 · 10 con E1; cada componente usa solo sus valores permitidos.
□ highRisks: solo con E2+ y probabilidad ≥ 20; 90-100 solo con E3; con E2 el máximo es 89.
□ Cambios: CRÍTICO solo con E3 · ALTO con E2+ · un cambio E0 no se incluye.
□ criticalAlerts (CRÍTICA o ALTA) solo con E2+; lo demás va en mediumAlerts.
□ origin: si el título o la descripción dicen que ${companyName} no tiene, no ofrece, carece o no aparece en
  algo, el riesgo es PROPIO aunque lo provoque un competidor.
□ Todo competidor CRÍTICO, cambio CRÍTICO y brecha propia con impacto ≥ 6 o de presencia digital tiene su
  alerta CRÍTICA, con el nombre del competidor o de la brecha en el título.

━━━ TAMAÑOS DE LISTA: MÁXIMOS, NO METAS ━━━━━━━━━━━━━━━━━━━━
El sistema cuenta cada elemento como una señal y lo pondera en las métricas. Rellenar listas infla los
resultados y engaña al cliente. Incluye SOLO hallazgos con evidencia E1 o superior (E2+ para alertas
críticas y riesgos altos). Menos elementos con evidencia valen más que listas completas.
  • criticalAlerts (CRÍTICAS + ALTAS): máximo 3 · mediumAlerts: máximo 4
  • changesCol1 y changesCol2: máximo 6 cada una (reparte los cambios reales entre ambas)
  • opportunities: máximo 4 · rivalWeaknesses: máximo 6
  • highRisks: máximo 3 · mediumRisks: máximo 4
  • priceTrends: un elemento por competidor registrado; sin dato de precio → "Sin datos públicos disponibles"
Si una lista queda vacía porque no hubo hallazgos con evidencia, entrégala vacía ([]) y dilo en el resumen
(marketStatus / mainAlertDesc). Esto NO aplica a las listas fijas, que siempre van completas: competitors
(todos los registrados), benchmarkRows (9 filas), secondaryCompetitors (mínimo 3), newChannels (3),
dominantMessages (3), rivalAdvantages (3), strengths e improvements (5), las 6 recomendaciones y las señales.

━━━ REGLAS ABSOLUTAS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ SIEMPRE HACER:
• La fidelidad de la información es prioridad absoluta — cada dato debe tener fuente y frescura
• Incluir todos los competidores directos registrados
• Cada alerta y movimiento debe tener fuente (URL, medio, o "Estimado")
• Cada número (threat, nivel, score, probability, impact) con su campo *Basis según FASE 4
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
• Dejar campos de texto vacíos — si no hay datos: "Sin datos públicos disponibles" (las listas de hallazgos sí pueden ir vacías, ver TAMAÑOS DE LISTA)
• Dar recomendaciones genéricas como "mejorar redes sociales" sin especificidad
• Asignar un número sin poder escribir su *Basis con hecho, fecha y fuente
• Declarar una posición numérica de Google (#3, #7, "top 5") como dato duro. La herramienta de búsqueda NO devuelve posiciones de SERP reales. Solo puedes afirmar presencia o ausencia en resultados basándote en una búsqueda que realmente ejecutaste para esa entidad. Si no ejecutaste la búsqueda, escribe "Sin verificar" — es preferible una celda "Sin verificar" a una posición inventada, porque el cliente puede comprobar su propio posicionamiento en segundos y una cifra incorrecta destruye la credibilidad de todo el reporte.

━━━ ESTÁNDAR DE CALIDAD — EJEMPLOS OBLIGATORIOS ━━━━━━━━━━━━

ALERTA BUENA ✓:
"Competidor X lanzó un paquete 'Todo Incluido' con precio publicado en su sitio el [fecha], y en cinco días acumuló reseñas nuevas en Google. Fuente: [URL] · Esta semana"

ALERTA MALA ✗ (PROHIBIDA):
"El competidor mejoró su oferta recientemente" ← sin fecha, sin fuente, sin detalle

RECOMENDACIÓN BUENA ✓:
"CONTENIDO Y COMUNICACIÓN — Esta semana: publica tres casos de éxito reales con la métrica que logró cada cliente. Costo: $0. Tiempo: 2 horas. Impacto esperado: más consultas calificadas, porque [competidor] gana visibilidad con ese formato (fuente)."

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

Responde ÚNICAMENTE con JSON válido comenzando con { sin texto previo ni markdown. Los valores numéricos
van como números JSON (sin comillas, sin "%", sin "/10"). Los campos *Basis son texto de una oración.

{
  "generalTrend": "<tendencia específica y concreta para ${businessType} en ${country} esta semana>",

  "clientScore": {
    "overall": <entero 0-100, promedio ponderado de las cuatro dimensiones>,
    "price": <entero 0-100>,
    "digital": <entero 0-100>,
    "differentiation": <entero 0-100>,
    "speed": <entero 0-100>,
    "vsCompetitors": "<Por encima del promedio|En el promedio|Por debajo del promedio>",
    "strongAreas": ["<fortaleza concreta detectada>", "<fortaleza 2>"],
    "weakAreas": ["<área de mejora concreta>", "<área 2>"],
    "summary": "<1 oración que resume la posición competitiva del cliente hoy y en qué observaciones se basa>"
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
  "marketStatus": "<estado actual del mercado de ${businessType} en ${country} — una frase concreta>",
  "marketStatusDesc": "<2 oraciones con datos reales verificados esta semana y sus fuentes>",
  "mainAlertTitle": "<la alerta más urgente de esta semana — concreta y específica>",
  "mainAlertDesc": "<2-3 oraciones con datos reales, fecha y fuente verificable>",
  "mainAlertLevel": "<BAJO|MEDIO|ALTO|CRÍTICO — coherente con el nivel máximo de alertas y cambios>",

  "competitors": [
    {
      "name": "<nombre exacto — incluir TODOS los registrados>",
      "scope": "<Local|Regional|Nacional>",
      "threatFactors": { "overlap": <a: 0-3>, "move": <b: 0-3>, "strength": <c: 0-2>, "digital": <d: 0-1> },
      "threat": <1 + a + b + c + d>,
      "threatBasis": "<E? · a+b+c+d: hecho, fecha y fuente de cada factor>",
      "growth": "<↑ subió +X% · [fuente] | → Estable | ↓ bajó -X% · [fuente] | → Sin cambios verificables>",
      "recentMove": "<movimiento real con fecha y frescura, o 'Sin datos públicos disponibles'>",
      "riskLabel": "<BAJO|MEDIO|VIGILAR|CRÍTICO — coherente con threat>",
      "sourceUrl": "<URL donde encontraste info, o 'Sin presencia digital detectada'>",
      "socialMedia": {
        "mostActivePlatform": "<Instagram|Facebook|LinkedIn|TikTok|Sin presencia>",
        "lastPostDate": "<fecha aproximada o 'No detectado'>",
        "postFrequency": "<Diario|Semanal|Irregular|Inactivo|No detectado>",
        "topContentType": "<tipo de contenido o 'No detectado'>",
        "followersEstimate": "<número observado o 'No detectado'>",
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
      "action": "<acción concreta accionable para PYME — con costo y tiempo estimado en MXN>",
      "level": "<CRÍTICA|ALTA según la RÚBRICA DE ALERTAS>",
      "evidenceBasis": "<E3|E2 · por qué es CRÍTICA o ALTA (y no MEDIA) según la rúbrica>"
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
      "category": "<CAT · NIVEL según la RÚBRICA DE NIVEL DE CAMBIO>",
      "levelBasis": "<E? · por qué ese nivel, con fuente>",
      "date": "<día y mes abreviado del hecho>",
      "title": "<cambio real detectado — específico y concreto>",
      "description": "<detalle con fuente · frescura indicada>",
      "competitor": "<nombre del competidor o 'Mercado general'>"
    }
  ],
  "changesCol2": [
    {
      "icon": "<emoji>",
      "category": "<CAT · NIVEL>",
      "levelBasis": "<E? · por qué ese nivel, con fuente>",
      "date": "<día y mes abreviado>",
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
      "channel": "<nombre del canal de venta o adquisición recomendado para ${businessType} en ${industry}>",
      "desc": "<para qué sirve este canal en una frase corta>",
      "reason": "<argumento concreto de por qué conviene implementarlo ahora, basado en lo que estás viendo de la competencia o el mercado>"
    }
  ],
  "rivalAdvantages": [
    { "icon": "<emoji>", "text": "<ventaja visible y concreta del rival líder, con evidencia>", "bg": "#FCEBEB", "border": "#F7C1C1", "textColor": "#A32D2D" },
    { "icon": "<emoji>", "text": "<segunda ventaja del rival líder>", "bg": "#FCEBEB", "border": "#F7C1C1", "textColor": "#A32D2D" },
    { "icon": "✅", "text": "<la ventaja propia del cliente frente a ese rival>", "bg": "#EAF3DE", "border": "#C0DD97", "textColor": "#27500A" }
  ],
  "rivalLeaderName": "<nombre del competidor con mayor threat>",

  "opportunities": [
    {
      "icon": "<emoji>",
      "type": "<tipo de oportunidad específica>",
      "title": "<título concreto para ${businessType} PYME>",
      "description": "<descripción con el dato que la sustenta y la fuente>",
      "scoreFactors": { "demand": <a: 0|10|25|40>, "feasibility": <b: 5|20|30>, "gap": <c: 0|10|20>, "window": <d: 0|5|10> },
      "score": <a + b + c + d>,
      "scoreBasis": "<E? · a+b+c+d: evidencia de demanda, factibilidad, hueco y ventana, con fuente>",
      "window": "<ventana de tiempo: '2 semanas', '30 días', 'Este trimestre'>"
    }
  ],

  "rivalWeaknesses": [
    { "competitor": "<NOMBRE — preferir competidores directos>", "weakness": "<debilidad específica con evidencia concreta y fuente>" }
  ],

  "highRisks": [
    {
      "icon": "<emoji>",
      "title": "<riesgo real y concreto para PYME de ${businessType} — evento externo o plazo dentro de 90 días>",
      "origin": "<EXTERNO|PROPIO>",
      "probability": <entero 0-100 según la RÚBRICA DE PROBABILIDAD>,
      "probabilityBasis": "<E? · evento, fecha, fuente, y por qué esa banda y no la superior>",
      "impact": <entero 1-10 según la RÚBRICA DE IMPACTO>,
      "impactBasis": "<qué servicios, rutas, segmento o clientes del cliente se afectan y por qué esa banda>",
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
    { "factor": "Presencia de Mercado", "client": "<años estimados>", "comp1": "<o N/A>", "comp2": "<o N/A>", "comp3": "<o N/A>", "comp4": "<o N/A>", "comp5": "<o N/A>", "position": "<posición>" },
    { "factor": "Especialización", "client": "<descripción breve>", "comp1": "<o N/A>", "comp2": "<o N/A>", "comp3": "<o N/A>", "comp4": "<o N/A>", "comp5": "<o N/A>", "position": "<posición>" },
    { "factor": "Cobertura geográfica", "client": "<Local/Regional/Nacional>", "comp1": "<o N/A>", "comp2": "<o N/A>", "comp3": "<o N/A>", "comp4": "<o N/A>", "comp5": "<o N/A>", "position": "<posición>" }
  ],

  "secondaryCompetitors": [
    {
      "name": "<nombre del competidor adicional — del 6 al 10>",
      "category": "<tipo de empresa o servicio>",
      "threatFactors": { "overlap": <a: 0-3>, "move": <b: 0-3>, "strength": <c: 0-2>, "digital": <d: 0-1> },
      "threat": <1 + a + b + c + d>,
      "threatBasis": "<E? · a+b+c+d: hecho y fuente>",
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
      "impact": "<impacto esperado con la métrica que cambia y la base de la estimación>",
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
      "impact": "<métrica y base>",
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
