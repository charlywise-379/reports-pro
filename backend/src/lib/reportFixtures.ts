// Datos de ejemplo para pruebas y para el script de vista previa del reporte.
// `aiNormal` imita lo que devuelve la IA; `makeExtreme` lo estira a un extremo REALISTA (cadenas
// largas +100 a +150 caracteres, listas en el máximo del prompt, un URL sin espacios);
// `aiMinimal` ({}) fuerza todos los valores por defecto; `real` es un análisis real de la IA
// (caso Stick-A-Boom) que se lee del disco solo cuando se pide.
import fs from 'fs'
import path from 'path'
export const LOGO_STUB =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

export const LOGOS_STUB = {
  onDark: LOGO_STUB,
  onLight: LOGO_STUB.replace('data:image/png;', 'data:image/png;name=light;'),
}

export const FIXTURE_PROJECT: any = {
  id: 'proj_fixture_001',
  name: 'Estudio Boreal',
  companyName: 'Estudio Boreal',
  frequency: 'WEEKLY',
  deliveryChannel: 'EMAIL',
  deliveryTime: '07:00',
  setup: {
    industry: 'Diseño y comunicación digital',
    targetMarket: 'PYMES de servicios en México',
    country: 'México',
    geographicScope: ['Regional'],
    focusAreas: ['Precios', 'Campañas', 'Talento', 'Producto', 'Alianzas', 'Medios'],
    mainProducts: ['Branding', 'Sitios web', 'Campañas de performance'],
    directCompetitors: [
      { name: 'Atlas Creativo' }, { name: 'Norte Digital' }, { name: 'Pixel & Co' },
      { name: 'Marea Studio' }, { name: 'Faro Agencia' },
    ],
  },
}

export const FIXTURE_DATE_INFO: any = {
  weekNumber: 41,
  year: 2026,
  periodStart: '8 oct 2026',
  periodEnd: '15 oct 2026',
  generatedAt: 'jue, 07:00',
  nextMonth: 'noviembre de 2026',
  nextReportDate: 'jueves 22 de octubre',
}

const comp = (name: string, threat: number, growth: string, riskLabel: string, scope = 'Nacional') => ({
  name, scope, threat, growth, riskLabel,
  recentMove: `${name} lanzó una promoción de temporada y subió su inversión en anuncios de búsqueda.`,
})

export const aiNormal: any = {
  competitivePressure: 72, opportunityScore: 68, marketRisk: 44, riskLevel: 'MEDIO',
  generalTrend: 'TENDENCIA AL ALZA', trendDelta: '+4',
  signalsCount: '38', signalsDelta: 12, movementsCount: 14, criticalMovements: 3, minorMovements: 11, totalChanges: 14,
  insights: [
    { category: 'PRECIO · ALTO', text: 'Atlas Creativo bajó 12% su paquete de branding; Fuente: sitio oficial, hace 2 días.' },
    { category: 'OPORTUNIDAD · ALTA', text: 'La búsqueda de “rediseño de sitio web” creció 31% en el último mes en tu región.' },
    { category: 'ANÁLISIS · INFO', text: 'Norte Digital contrató a tres perfiles de performance según LinkedIn.' },
  ],
  actions: [
    { priority: 'ALTA', text: 'Ajusta tu paquete básico de branding a $18,000 MXN antes del viernes y destácalo en tu sitio.' },
    { priority: 'MED', text: 'Publica dos casos de éxito de sitios web esta semana con resultados medibles.' },
    { priority: 'BAJA', text: 'Revisa tu perfil de Google Business y agrega fotos nuevas del equipo.' },
  ],
  earlyWarning: 'Pixel & Co anunciará una alianza con una casa de software la próxima semana.',
  marketStatus: 'Mercado competitivo con ventana de oportunidad',
  marketStatusDesc: 'La presión sube por promociones de precio, pero la demanda de sitios web crece y deja espacio para diferenciarte.',
  mainAlertTitle: 'Guerra de precios en branding',
  mainAlertDesc: 'Tres competidores bajaron tarifas en los últimos 7 días.',
  mainAlertLevel: 'ALTO',
  competitors: [
    comp('Atlas Creativo', 9, '↑ subió +18% Esta semana', 'CRÍTICO'),
    comp('Norte Digital', 7, '↑ subió +9% Esta semana', 'VIGILAR'),
    comp('Pixel & Co', 5, '→ Estable', 'MEDIO'),
    comp('Marea Studio', 3, '↓ bajó -6%', 'BAJO', 'Regional'),
    comp('Faro Agencia', 6, '↑ subió +4% Esta semana', 'VIGILAR', 'Regional'),
  ],
  mostAggressiveName: 'Atlas Creativo', mostAggressiveDesc: 'Mayor inversión publicitaria y baja de precios.',
  weakestName: 'Marea Studio', weakestDesc: 'Sin lanzamientos ni campañas en 30 días.',
  emergingName: 'Faro Agencia', emergingDesc: 'Crecimiento sostenido en búsquedas de marca.',
  criticalAlerts: [
    { icon: '🔥', title: 'Baja de precios de Atlas Creativo', detected: '13 oct 2026 · Fuente: atlascreativo.mx', description: 'Redujo 12% el paquete de branding y ofrece instalación de sitio sin costo por tiempo limitado.', action: 'Responde con una oferta de valor agregado, no con descuento directo.' },
    { icon: '⚡', title: 'Nuevo equipo de performance en Norte Digital', detected: '12 oct 2026 · Fuente: LinkedIn', description: 'Tres contrataciones en campañas de pago apuntan a una ofensiva en búsqueda local.', action: 'Refuerza tus palabras clave de marca y vigila su inversión semanal.' },
  ],
  mediumAlerts: [
    { icon: '📰', title: 'Pixel & Co en medios regionales', source: 'El Economista', description: 'Entrevista a su director sobre automatización de campañas.' },
    { icon: '📣', title: 'Campaña de Faro Agencia en redes', source: 'Instagram', description: 'Serie de reels con casos de clientes locales.' },
  ],
  changesCol1: [
    { icon: '💰', category: 'PRECIO · ALTO', date: '13 oct', title: 'Paquete básico a $17,900', description: 'Atlas Creativo reduce 12% su entrada.', competitor: 'Atlas Creativo' },
    { icon: '🧑‍💼', category: 'TALENTO · MEDIO', date: '12 oct', title: 'Tres vacantes de performance', description: 'Norte Digital abre contrataciones en Monterrey.', competitor: 'Norte Digital' },
    { icon: '🚀', category: 'PRODUCTO · MEDIO', date: '11 oct', title: 'Nuevo servicio de analítica', description: 'Pixel & Co lanza tableros para clientes.', competitor: 'Pixel & Co' },
  ],
  changesCol2: [
    { icon: '🤝', category: 'ALIANZA · BAJO', date: '10 oct', title: 'Alianza con proveedor de CRM', description: 'Faro Agencia anuncia integración con un CRM local.', competitor: 'Faro Agencia' },
    { icon: '📢', category: 'CAMPAÑA · MEDIO', date: '9 oct', title: 'Campaña de fin de año', description: 'Atlas Creativo adelanta su campaña de temporada.', competitor: 'Atlas Creativo' },
    { icon: '🌎', category: 'EXPANSIÓN · BAJO', date: '8 oct', title: 'Apertura en Guadalajara', description: 'Marea Studio abre oficina comercial.', competitor: 'Marea Studio' },
  ],
  priceTrends: [
    { name: 'Branding básico', change: '↓ bajó -12% Esta semana · Fuente: sitio oficial' },
    { name: 'Sitio web corporativo', change: '→ Estable' },
    { name: 'Gestión de campañas', change: '↑ subió +5% Esta semana' },
  ],
  priceTrendAlert: 'Los precios de branding bajan por segunda semana consecutiva en tu región.',
  dominantMessages: [
    { competitor: 'Atlas Creativo', message: 'Resultados garantizados en 90 días.' },
    { competitor: 'Norte Digital', message: 'Performance con transparencia total.' },
    { competitor: 'Pixel & Co', message: 'Automatiza tu marketing con IA.' },
  ],
  targetSegments: [
    { name: 'PYMES DE SERVICIOS', pct: 46, desc: 'Segmento principal de los cinco competidores.' },
    { name: 'RETAIL LOCAL', pct: 31, desc: 'Atlas Creativo y Faro Agencia compiten fuerte.' },
    { name: 'SALUD Y BIENESTAR', pct: 23, desc: 'Nicho poco atendido con oportunidad.' },
  ],
  newChannels: [
    { icon: '📲', channel: 'WhatsApp Business API', desc: 'Atención directa', reason: 'Alta tasa de respuesta en LATAM con bajo costo.' },
    { icon: '💼', channel: 'LinkedIn Ads B2B', desc: 'Ejecutivos', reason: 'Segmentación por cargo e industria.' },
    { icon: '📍', channel: 'SEO local', desc: 'Búsquedas cercanas', reason: 'Captura demanda con intención de compra inmediata.' },
  ],
  rivalLeaderName: 'Atlas Creativo',
  rivalAdvantages: [
    { icon: '🥇', text: 'Mayor inversión publicitaria detectada' },
    { icon: '🥇', text: 'Presencia activa en tres ciudades' },
    { icon: '✅', text: 'Tu ventaja: atención directa del director y datos reales' },
  ],
  opportunities: [
    { icon: '🎯', type: 'Demanda creciente', score: 86, title: 'Rediseño de sitios web para PYMES', description: 'La búsqueda del servicio creció 31% y solo dos competidores lo ofrecen con garantía.', window: '2 semanas' },
    { icon: '📈', type: 'Nicho desatendido', score: 78, title: 'Marketing para clínicas y bienestar', description: 'Ningún competidor publica casos del sector salud en la región.', window: '30 días' },
    { icon: '🤝', type: 'Alianza', score: 64, title: 'Convenio con cámaras empresariales', description: 'Acceso a base de socios con descuento por afiliación.', window: 'Este trimestre' },
    { icon: '💡', type: 'Contenido', score: 58, title: 'Serie de casos con resultados medibles', description: 'Los competidores no muestran métricas verificables.', window: '30 días' },
  ],
  rivalWeaknesses: [
    { competitor: 'Atlas Creativo', weakness: 'Tiempos de entrega de 8 semanas según reseñas.' },
    { competitor: 'Norte Digital', weakness: 'Sin presencia en sector salud.' },
    { competitor: 'Pixel & Co', weakness: 'Precios altos para PYMES pequeñas.' },
  ],
  highRisks: [
    { icon: '⚠️', title: 'Pérdida de clientes por precio', probability: 72, description: 'La baja de Atlas Creativo presiona a tus cuentas de menor ticket.', mitigation: 'Ofrece contratos anuales con beneficios adicionales. Costo estimado $4,000 MXN, 1 semana.' },
    { icon: '⚠️', title: 'Fuga de talento de performance', probability: 55, description: 'Norte Digital ofrece sueldos 15% mayores.', mitigation: 'Revisa compensación y esquema de bonos. 2 semanas.' },
    { icon: '⚠️', title: 'Saturación en búsqueda local', probability: 38, description: 'El costo por clic subió 9% en tus palabras clave.', mitigation: 'Diversifica a SEO y marketing de contenidos.' },
  ],
  mediumRisks: [
    { icon: '⚠️', title: 'Dependencia de un solo canal', description: 'Más del 60% de tus leads llega por recomendación.' },
    { icon: '⚠️', title: 'Cambios regulatorios de datos', description: 'Nueva guía de privacidad para campañas digitales.' },
  ],
  benchmarkRows: [
    { factor: 'Precio / Tarifas', client: 'MEDIO', comp1: 'BAJO', comp2: 'ALTO', comp3: 'ALTO', comp4: 'MEDIO', comp5: 'MEDIO', position: '2do lugar' },
    { factor: 'Servicios ofrecidos', client: 'Branding, web, performance', comp1: 'Amplio', comp2: 'Performance', comp3: 'Automatización', comp4: 'Branding', comp5: 'Web', position: '1er lugar' },
    { factor: 'Presencia digital', client: 'MEDIA', comp1: 'ALTA', comp2: 'ALTA', comp3: 'MEDIA', comp4: 'BAJA', comp5: 'MEDIA', position: '3er lugar' },
    { factor: 'SEO / Posicionamiento Google', client: 'Top 10 orgánico', comp1: 'Top 3 orgánico', comp2: 'Top 10 orgánico', comp3: 'Sin verificar', comp4: 'No aparece', comp5: 'Top 10 orgánico', position: '3er lugar' },
    { factor: 'Casos de éxito / Portafolio', client: 'PARCIAL', comp1: 'SÍ visible', comp2: 'SÍ visible', comp3: 'PARCIAL', comp4: 'NO visible', comp5: 'PARCIAL', position: '3er lugar' },
    { factor: 'Cobertura geográfica', client: 'Regional', comp1: 'Nacional', comp2: 'Nacional', comp3: 'Regional', comp4: 'Local', comp5: 'Regional', position: '2do lugar' },
  ],
  strengths: ['Atención directa del director', 'Retención de clientes', 'Agilidad de respuesta', 'Conocimiento del mercado local', 'Flexibilidad operativa'],
  improvements: ['Presencia en búsqueda', 'Casos de éxito publicados', 'Inversión publicitaria', 'Automatización de reportes', 'Diversificación de canales'],
  highPriorityRecs: [
    { number: 1, title: 'PRECIO — Reposiciona tu paquete básico', owner: 'CEO', deadline: 'Esta semana', description: 'Define un paquete de entrada a $18,000 MXN con tres entregables claros y comunícalo en tu sitio y redes.', impact: '+20% en consultas', difficulty: 'FÁCIL', timeRequired: 'CORTO (1-3 días)', costRequired: 'BAJO (menos $5,000 MXN)' },
    { number: 2, title: 'CONTENIDO — Publica casos con métricas', owner: 'Marketing', deadline: 'En 7 días', description: 'Documenta dos proyectos recientes con resultados medibles y súbelos como casos de éxito.', impact: '-15% costo de adquisición', difficulty: 'MEDIO', timeRequired: 'MEDIO (1-2 semanas)', costRequired: 'MEDIO ($5,000-$20,000)' },
  ],
  mediumPriorityRecs: [
    { number: 3, title: 'CANALES — Activa WhatsApp Business', owner: 'Ventas', deadline: 'En 15 días', description: 'Configura catálogo y respuestas rápidas para captar leads.', impact: '+10% en cierres', difficulty: 'MEDIO', timeRequired: 'MEDIO', costRequired: 'BAJO' },
    { number: 4, title: 'TALENTO — Revisa compensación', owner: 'Operaciones', deadline: 'En 15 días', description: 'Compara sueldos del mercado para perfiles de performance.', impact: 'Menor rotación', difficulty: 'DIFÍCIL', timeRequired: 'LARGO', costRequired: 'ALTO' },
  ],
  lowPriorityRecs: [
    { number: 5, title: 'SEO — Auditoría técnica del sitio', deadline: 'En 30 días', description: 'Revisa velocidad y estructura de encabezados.', impact: 'Mejor posicionamiento' },
  ],
  secondaryCompetitors: [
    { name: 'Costa Brand', category: 'Branding', recentMove: 'Nuevo portafolio de identidad.', threat: 4 },
    { name: 'Lumen Web', category: 'Desarrollo web', recentMove: 'Plantillas para PYMES.', threat: 3 },
    { name: 'Eco Media', category: 'Medios', recentMove: 'Alianza con radio local.', threat: 2 },
    { name: 'Nodo Growth', category: 'Performance', recentMove: 'Webinar mensual.', threat: 5 },
  ],
  criticalSignals: ['Movimiento de precios rival', 'Lanzamiento de producto', 'Alianza estratégica', 'Nuevo jugador'],
  importantSignals: ['CPL supera umbral', 'Viralización en redes', 'Contrataciones clave', 'Reseñas negativas'],
  infoSignals: ['Rankings App Store', 'Menciones en medios', 'Movimiento de keywords SEO', 'Cambios regulatorios'],
}

// Sufijos calibrados con los textos reales de la IA: las cadenas largas (> 40) crecen ~125 caracteres
// (con una fuente tipo URL sin espacios, como las que cita la IA) y las medianas ~40.
const LONG_SUFFIX = ' · Fuente: competidor-ejemplo.com.mx/promociones/temporada-alta-2026 · verificado esta semana con cifras y contexto'
const MID_SUFFIX = ' · detalle adicional verificado esta semana'

function stretch(v: any): any {
  if (typeof v === 'string') return v.length > 40 ? v + LONG_SUFFIX : v.length > 12 ? v + MID_SUFFIX : v
  if (Array.isArray(v)) return v.map(stretch)
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'icon' ? x : stretch(x)]))
  return v
}

export function makeExtreme(base: any): any {
  const e = stretch(base)
  const grow = (arr: any[], n: number) => Array.from({ length: n }, (_, i) => arr[i % arr.length])
  e.changesCol1 = grow(e.changesCol1, 6)
  e.changesCol2 = grow(e.changesCol2, 6)
  e.criticalAlerts = grow(e.criticalAlerts, 3)
  e.mediumAlerts = grow(e.mediumAlerts, 4)
  e.secondaryCompetitors = grow(e.secondaryCompetitors, 8)
  e.mediumRisks = grow(e.mediumRisks, 6)
  e.highPriorityRecs = grow(e.highPriorityRecs, 2)
  e.mediumPriorityRecs = grow(e.mediumPriorityRecs, 2)
  e.lowPriorityRecs = grow(e.lowPriorityRecs, 2)
  e.benchmarkRows = grow(e.benchmarkRows, 9).map((r: any, i: number) => i < 6 ? r : { ...r, factor: ['Redes sociales', 'Presencia de Mercado', 'Especialización'][i - 6] })
  e.insights = [...e.insights]
  e.competitors = grow(e.competitors, 5)
  e.competitors[0].name = 'Competidor con un nombre excepcionalmente largo S.A. de C.V.'
  return e
}

export const aiExtreme: any = makeExtreme(aiNormal)
export const aiMinimal: any = {}

// Proyecto del caso real (Stick-A-Boom) para renderizar `FIXTURES.real` con su giro y mercado reales.
export const FIXTURE_PROJECT_REAL: any = {
  id: 'stickaboom-muestra',
  name: 'Stick-A-Boom — Inteligencia Competitiva',
  companyName: 'Stick-A-Boom',
  frequency: 'WEEKLY',
  deliveryChannel: 'EMAIL',
  deliveryTime: '07:00',
  setup: {
    companyName: 'Stick-A-Boom',
    website: 'https://stickaboom.com',
    industry: 'Impresión de stickers, calcomanías y etiquetas personalizadas (tienda en línea)',
    targetMarket: 'Organizadores de eventos (bodas, XV años, cumpleaños y corporativos), padres de familia que compran etiquetas escolares, emprendedores que compran al mayoreo y personas de manualidades',
    country: 'México',
    geographicScope: ['Nacional'],
    focusAreas: ['Precios', 'Lanzamientos de producto', 'Promociones y descuentos', 'Redes sociales', 'Posicionamiento en buscadores', 'Envíos y tiempos de entrega'],
    mainProducts: [
      'Calcomanías personalizadas en acabado brillo, mate, transparente y metálico',
      'Stickers holográficos, galácticos y reflejantes', 'Hojas de stickers', 'Etiquetas escolares', 'Etiquetas para regalos y eventos',
    ],
    directCompetitors: [
      { name: 'Sticker Mule' }, { name: 'Creatify' }, { name: 'Stickeria' }, { name: 'Pegalinas.com' }, { name: 'Pop México' },
    ],
  },
}

export type FixtureName = 'normal' | 'extreme' | 'minimal' | 'real'

let realCache: any
export const FIXTURES = {
  normal: aiNormal,
  extreme: aiExtreme,
  minimal: aiMinimal,
  // Perezoso: importar este módulo no lee el archivo (y el JSON no entra a la compilación de producción).
  get real(): any {
    if (!realCache) realCache = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'ai-real-stickaboom.json'), 'utf-8'))
    return realCache
  },
} as Record<FixtureName, any>

// Proyecto con el que se renderiza cada fixture (la real usa el caso Stick-A-Boom).
export const fixtureProject = (name: FixtureName): any => (name === 'real' ? FIXTURE_PROJECT_REAL : FIXTURE_PROJECT)
