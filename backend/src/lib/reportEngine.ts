import puppeteer from 'puppeteer-core'
import chromium from 'chrome-aws-lambda'
import fs from 'fs'
import path from 'path'

// ─── Tipos ───────────────────────────────────────────
interface ReportData {
  // Empresa
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

  // Scores
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

  // KPIs
  signalsCount: string
  signalsDelta: number
  movementsCount: number
  criticalMovements: number
  minorMovements: number
  alertsCount: number
  activeCompetitors: number
  totalChanges: number

  // Página 1
  insights: { color: string; borderColor: string; category: string; text: string }[]
  actions: { color: string; borderColor: string; priority: string; text: string }[]
  topCompetitors: any[]
  earlyWarning: string

  // Página 2
  marketStatus: string
  marketStatusDesc: string
  gaugeMetrics: any[]
  sectorMetrics: any[]
  mainAlertTitle: string
  mainAlertDesc: string
  mainAlertLevel: string

  // Página 3
  competitors: any[]
  mostAggressiveName: string
  mostAggressiveDesc: string
  weakestName: string
  weakestDesc: string
  emergingName: string
  emergingDesc: string

  // Página 4
  criticalAlertsCount: number
  mediumAlertsCount: number
  criticalAlerts: any[]
  mediumAlerts: any[]

  // Página 5
  changesCol1: any[]
  changesCol2: any[]

  // Página 6
  priceTrends: any[]
  priceTrendAlert: string
  dominantMessages: any[]
  targetSegments: any[]
  newChannels: any[]
  rivalAdvantages: any[]

  // Página 7
  opportunitiesCount: number
  opportunities: any[]
  rivalWeaknesses: any[]

  // Página 8
  highRisksCount: number
  mediumRisksCount: number
  highRisks: any[]
  mediumRisks: any[]

  // Página 9
  benchmarkFactors: number
  benchmarkCompetitors: any[]
  benchmarkRows?: any[]
  radarPoints: string
  strengths: string[]
  improvements: string[]

  // Página 10
  highPriorityRecs: any[]
  mediumPriorityRecs: any[]
  lowPriorityRecs: any[]

  // Página 11
  weeklyPlans?: any[]
  criticalSignals: string[]
  importantSignals: string[]
  infoSignals: string[]
  benchmarkRowsHTML?: string
  weeklyPlansHTML?: string
}

// ─── Renderizar plantilla con datos ──────────────────
function renderTemplate(template: string, data: any): string {
  let html = template

  // Procesar each anidados primero (each dentro de each)
  const processEach = (str: string, context: any): string => {
  let result = str
  let maxPasses = 5
  
  while (maxPasses-- > 0) {
    const before = result
    
    result = result.replace(/\{\{#each ([\w.]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_match, key, block) => {
      // Resolver la key — puede ser 'this.items', 'weeklyPlans', etc.
      let arr: any[]
      if (key === 'this') {
        arr = Array.isArray(context) ? context : []
      } else if (key.startsWith('this.')) {
        const prop = key.slice(5)
        arr = context?.[prop] ?? []
      } else {
        arr = context?.[key] ?? []
      }
      
      if (!Array.isArray(arr)) return ''
      
      return arr.map((item: any) => {
        let rendered = block
        
        // Procesar each anidados recursivamente con el item como contexto
        rendered = processEach(rendered, item)
        
        // Variables {{this.prop}}
        rendered = rendered.replace(/\{\{this\.(\w+)\}\}/g, (_: string, prop: string) => {
          return item?.[prop] !== undefined ? String(item[prop]) : ''
        })
        
        // Variable {{this}} string simple
        rendered = rendered.replace(/\{\{this\}\}/g, () => {
          return typeof item === 'string' ? item : ''
        })
        
        // Variables del contexto padre {{prop}}
        rendered = rendered.replace(/\{\{(\w+)\}\}/g, (_: string, prop: string) => {
          if (item?.[prop] !== undefined) return String(item[prop])
          if (context?.[prop] !== undefined) return String(context[prop])
          return ''
        })
        
        return rendered
      }).join('')
    })
    
    // Si no hubo cambios, terminamos
    if (result === before) break
  }
  
  return result
}

  // Primero procesar todos los each con el data completo
  html = processEach(html, data)

  // Luego reemplazar variables simples restantes
  html = html.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    return data[key] !== undefined ? String(data[key]) : ''
  })

  return html
}

// ─── Calcular gauge path y aguja ─────────────────────
function calcGauge(value: number): { gaugePath: string; needleX: number; needleY: number; pressureDash: number } {
  // El semicírculo va de 40,180 a 320,180 pasando por arriba
  // value 0-100 → ángulo -180° a 0° (desde izquierda a derecha)
  const angle = -180 + (value / 100) * 180
  const rad = (angle * Math.PI) / 180
  const cx = 180, cy = 180, r = 140
  const endX = cx + r * Math.cos(rad)
  const endY = cy + r * Math.sin(rad)
  // Aguja
  const needleRad = rad
  const needleX = Math.round(cx + 110 * Math.cos(needleRad))
  const needleY = Math.round(cy + 110 * Math.sin(needleRad))
  const pressureDash = Math.round((value / 100) * 289)
  return {
    gaugePath: `${Math.round(endX)} ${Math.round(endY)}`,
    needleX,
    needleY,
    pressureDash
  }
}

// ─── Generar datos de demostración ───────────────────
export function generateDemoData(project: any): ReportData {
  const now = new Date()
  const weekNumber = Math.ceil(now.getDate() / 7) + (now.getMonth() * 4)
  const year = now.getFullYear()
  const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    .toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
  const periodEnd = now.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
  const nextReport = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const companyName = project.companyName || 'Tu Empresa'
  const industry = project.setup?.industry || 'Tu industria'
  const competitors = project.setup?.directCompetitors?.filter((c: any) => c.name) || []
  const competitorsCount = Math.max(competitors.length, 3)

  const pressure = 68
  const opportunity = 74
  const gauge = calcGauge(pressure)
  const opportunityDash = Math.round((opportunity / 100) * 289)

  // Nombres de competidores reales o demo
  const comp1 = competitors[0]?.name || 'Competidor A'
  const comp2 = competitors[1]?.name || 'Competidor B'
  const comp3 = competitors[2]?.name || 'Competidor C'
  const comp4 = competitors[3]?.name || 'Competidor D'

  const c1init = comp1.slice(0, 2).toUpperCase()
  const c2init = comp2.slice(0, 2).toUpperCase()
  const c3init = comp3.slice(0, 2).toUpperCase()
  const c4init = comp4.slice(0, 2).toUpperCase()

  return {
    // Empresa
    companyName,
    industry,
    targetMarket: project.setup?.targetMarket || 'LATAM',
    tags: project.setup?.tags?.slice(0, 4) || [industry, 'AI', 'B2B', 'SaaS'],
    weekNumber,
    year,
    edition: 1,
    periodStart,
    periodEnd,
    generatedAt: now.toLocaleDateString('es-MX', { weekday: 'short', hour: '2-digit', minute: '2-digit' }),
    nextMonth: nextReport.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }),
    nextReportDate: nextReport.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }),
    nextReportTime: project.deliveryTime || '07:00 UTC-5',
    nextEdition: 2,
    deliveryChannel: project.deliveryChannel === 'BOTH' ? 'Email + WhatsApp' : project.deliveryChannel === 'WHATSAPP' ? 'WhatsApp' : 'Email',
    frequency: project.frequency === 'WEEKLY' ? 'Semanal' : project.frequency === 'DAILY' ? 'Diario' : 'Quincenal',
    activeAreas: (project.setup?.focusAreas || []).length || 6,
    competitorsCount,

    // Scores
    competitivePressure: pressure,
    opportunityScore: opportunity,
    marketRisk: 18,
    riskLevel: 'MEDIO',
    generalTrend: 'TENDENCIA FAVORABLE',
    trendDelta: '+8',
    pressureDash: gauge.pressureDash,
    opportunityDash,
    gaugePath: gauge.gaugePath,
    needleX: gauge.needleX,
    needleY: gauge.needleY,

    // KPIs
    signalsCount: '1,240',
    signalsDelta: 18,
    movementsCount: 14,
    criticalMovements: 4,
    minorMovements: 10,
    alertsCount: 3,
    activeCompetitors: competitorsCount,
    totalChanges: 12,

    // Página 1 — insights
    insights: [
      { color: '#BA7517', borderColor: '#FAC775', category: 'PRECIO · URGENTE', text: `${comp1} redujo precios −12% en su línea principal. Guerra de precios inminente en Q2 ${year}.` },
      { color: '#534AB7', borderColor: '#CECBF6', category: 'TALENTO · SEÑAL', text: `${comp2} contrató 3 directivos clave — señal de aceleración de producto en segmento mid-market.` },
      { color: '#1D9E75', borderColor: '#9FE1CB', category: 'OPORTUNIDAD · ABIERTA', text: `Nicho sin cobertura rival detectado en zona norte. Ventana de 30 días estimada.` },
    ],
    actions: [
      { color: '#E24B4A', borderColor: '#F7C1C1', priority: 'ALTA', text: `Revisar precios antes del próximo lunes — no perder competitividad vs ${comp1}.` },
      { color: '#BA7517', borderColor: '#FAC775', priority: 'MED', text: `Activar retención de top 50 clientes antes que ${comp2} intensifique su ofensiva.` },
      { color: '#1D9E75', borderColor: '#9FE1CB', priority: 'MED', text: 'Explorar piloto en zona norte — nicho sin competidor activo identificado esta semana.' },
    ],
    topCompetitors: [
      { initials: c1init, name: comp1, color: '#E24B4A', borderColor: '#F7C1C1', trackColor: 'rgba(226,75,74,0.15)', threat: 9, threatPct: 90 },
      { initials: c2init, name: comp2, color: '#BA7517', borderColor: '#FAC775', trackColor: 'rgba(186,117,23,0.15)', threat: 7, threatPct: 70 },
      { initials: c3init, name: comp3, color: '#534AB7', borderColor: '#CECBF6', trackColor: 'rgba(83,74,183,0.15)', threat: 6, threatPct: 60 },
      { initials: c4init, name: comp4, color: '#1D9E75', borderColor: '#9FE1CB', trackColor: 'rgba(29,158,117,0.15)', threat: 3, threatPct: 30 },
    ],
    earlyWarning: `${comp1}: 3 señales simultáneas — precio + hiring + campaña. Posible ofensiva de mercado Q2 ${year}.`,

    // Página 2
    marketStatus: 'Mercado en tensión moderada',
    marketStatusDesc: 'El ecosistema muestra actividad inusual — monitoreo intensificado recomendado esta semana.',
    gaugeMetrics: [
      { label: 'AGRESIVIDAD PRECIOS', value: 85, status: 'MUY ALTO', color: '#534AB7', bg: '#F8F7FF', border: '#CECBF6', labelColor: '#534AB7', trackColor: '#CECBF6', textColor: '#26215C', dash: 191, gap: 35 },
      { label: 'ACTIVIDAD CAMPAÑAS', value: 64, status: 'MODERADO', color: '#BA7517', bg: '#FAEEDA', border: '#FAC775', labelColor: '#854F0B', trackColor: '#FAC775', textColor: '#633806', dash: 144, gap: 82 },
      { label: 'EXPANSIÓN GEOGRÁFICA', value: 45, status: 'BAJO', color: '#1D9E75', bg: '#EAF3DE', border: '#C0DD97', labelColor: '#3B6D11', trackColor: '#C0DD97', textColor: '#085041', dash: 101, gap: 125 },
      { label: 'MOVIMIENTO TALENTO', value: 75, status: 'ALTO', color: '#E24B4A', bg: '#FCEBEB', border: '#F7C1C1', labelColor: '#A32D2D', trackColor: '#F7C1C1', textColor: '#501313', dash: 169, gap: 57 },
    ],
    sectorMetrics: [
      { label: 'NUEVOS COMPETIDORES', value: '2', sub: 'detectados esta sem.', color: '#534AB7' },
      { label: 'CAMBIOS DE PRECIO', value: '5', sub: `en ${competitorsCount} competidores`, color: '#E24B4A' },
      { label: 'CAMPAÑAS ACTIVAS', value: '8', sub: 'paid + orgánico', color: '#BA7517' },
      { label: 'LANZAMIENTOS', value: '3', sub: 'nuevos productos', color: '#1D9E75' },
      { label: 'FUSIONES / ALIANZAS', value: '1', sub: 'en seguimiento', color: '#8B7BFF' },
    ],
    mainAlertTitle: `${comp1} activó 3 señales de presión simultáneas esta semana.`,
    mainAlertDesc: `Reducción de precios, contratación de directivos comerciales y lanzamiento de campaña paid agresiva. Esta combinación sugiere preparación para una ofensiva de mercado en Q2 ${year}.`,
    mainAlertLevel: 'ALTO',

    // Página 3
    competitors: [
      { rank: 1, initials: c1init, name: comp1, scope: 'Internacional', category: 'Competidor directo', categoryLabel: industry, tagBg: '#FCEBEB', tagColor: '#A32D2D', color: '#E24B4A', trackColor: 'rgba(226,75,74,0.15)', threat: 9, threatPct: 90, growth: '↑ +34%', growthColor: '#E24B4A', recentMove: 'Bajó precios −12% · Campaña agresiva', riskBg: '#E24B4A', riskColor: '#fff', riskBorder: '#E24B4A', riskLabel: 'CRÍTICO' },
      { rank: 2, initials: c2init, name: comp2, scope: 'Regional', category: 'Competidor directo', categoryLabel: industry, tagBg: '#FAEEDA', tagColor: '#854F0B', color: '#BA7517', trackColor: 'rgba(186,117,23,0.15)', threat: 7, threatPct: 70, growth: '↑ +22%', growthColor: '#BA7517', recentMove: 'Contrató directivos clave · Nuevo producto', riskBg: '#BA7517', riskColor: '#fff', riskBorder: '#BA7517', riskLabel: 'VIGILAR' },
      { rank: 3, initials: c3init, name: comp3, scope: 'Nacional', category: 'Competidor directo', categoryLabel: industry, tagBg: '#F8F7FF', tagColor: '#534AB7', color: '#534AB7', trackColor: 'rgba(83,74,183,0.15)', threat: 6, threatPct: 60, growth: '↑ +15%', growthColor: '#534AB7', recentMove: 'Expansión regional · App actualizada', riskBg: '#534AB7', riskColor: '#fff', riskBorder: '#534AB7', riskLabel: 'MEDIO' },
      { rank: 4, initials: c4init, name: comp4, scope: 'Local', category: 'Competidor indirecto', categoryLabel: 'Sustituto', tagBg: '#F5F5F5', tagColor: '#555', color: '#888', trackColor: 'rgba(136,136,136,0.15)', threat: 3, threatPct: 30, growth: '→ 0%', growthColor: '#888', recentMove: 'Sin movimientos detectados esta semana', riskBg: '#EAF3DE', riskColor: '#27500A', riskBorder: '#C0DD97', riskLabel: 'BAJO' },
    ],
    mostAggressiveName: comp1,
    mostAggressiveDesc: `Activó precio + hiring + campaña simultáneamente. Señal clara de ofensiva planificada para Q2 ${year}.`,
    weakestName: comp4,
    weakestDesc: 'Sin movimientos detectados en 3 semanas consecutivas. Posible contracción o pausa estratégica.',
    emergingName: comp2,
    emergingDesc: `Creció +22% y contrató talento clave. Podría superar a ${comp1} en presencia digital en 60 días.`,

    // Página 4
    criticalAlertsCount: 3,
    mediumAlertsCount: 4,
    criticalAlerts: [
      { icon: '💸', title: `${comp1} — Guerra de precios`, detected: 'Detectado hace 18h · Fuente: Scraping + Ads', description: `Reducción de −12% en producto principal simultánea a campaña de captación masiva. Patrón consistente con estrategia de penetración de mercado agresiva.`, action: 'Responder antes del próximo lunes o perder posición de precio' },
      { icon: '👥', title: `${comp2} — Contrataciones estratégicas`, detected: 'Detectado hace 2 días · Fuente: LinkedIn', description: `3 directivos senior contratados con perfil especializado en el segmento que compites. Señal de aceleración de roadmap en segmento directo.`, action: 'Reforzar diferenciación en próximas 2 semanas' },
      { icon: '🌎', title: `${comp3} — Expansión geográfica`, detected: 'Detectado hace 3 días · Fuente: Registro + LinkedIn', description: 'Constitución de entidad jurídica en nuevo mercado detectada. Publicaron vacantes locales. Entrada inminente al mercado.', action: 'Activar estrategia de defensa antes de su lanzamiento' },
    ],
    mediumAlerts: [
      { icon: '📱', title: 'Nueva tecnología adoptada', source: `${comp2} · hace 4 días`, description: 'Integración con nueva plataforma tecnológica detectada en su app. Mejora significativa de experiencia de usuario en onboarding.' },
      { icon: '🤝', title: 'Posible alianza detectada', source: `${comp1} · hace 5 días`, description: 'Reuniones ejecutivas detectadas con posible socio estratégico. Podría dar acceso a millones de clientes adicionales.' },
      { icon: '⭐', title: 'Señales reputacionales negativas', source: `${comp4} · hace 6 días`, description: 'Spike de reseñas negativas detectado. Quejas sobre problemas técnicos. Oportunidad de captación de sus clientes insatisfechos.' },
      { icon: '🏦', title: 'Posible nuevo jugador', source: 'Sector · hace 7 días', description: `Startup nueva en proceso de registro detectada. Fundadores con track record probado. Levantamiento seed detectado en Crunchbase.` },
    ],

    // Página 5
    changesCol1: [
      { icon: '💸', color: '#E24B4A', borderColor: '#F7C1C1', category: 'PRECIO · CRÍTICO', date: `Lun · ${periodStart}`, title: `${comp1} bajó precios −12%`, description: 'Aplicado en todos los canales digitales simultáneamente.', competitor: comp1 },
      { icon: '👥', color: '#BA7517', borderColor: '#FAC775', category: 'TALENTO · ALTO', date: `Mar · ${periodStart}`, title: `${comp2} contrató Director Comercial`, description: 'Perfil orientado a expansión B2B y enterprise. Incorporación inmediata.', competitor: comp2 },
      { icon: '🌎', color: '#534AB7', borderColor: '#CECBF6', category: 'EXPANSIÓN · MEDIO', date: `Mié · ${periodEnd}`, title: `${comp3} abrió operaciones en nueva región`, description: 'Registro legal confirmado. Publicaron vacantes locales. Lanzamiento estimado Q3.', competitor: comp3 },
      { icon: '📱', color: '#1D9E75', borderColor: '#C0DD97', category: 'PRODUCTO · MEDIO', date: `Vie · ${periodEnd}`, title: `${comp2} lanzó nueva versión de app`, description: 'Onboarding rediseñado y nuevas integraciones. Rating subió significativamente.', competitor: comp2 },
    ],
    changesCol2: [
      { icon: '📢', color: '#E24B4A', borderColor: '#F7C1C1', category: 'CAMPAÑA · CRÍTICO', date: `Lun · ${periodStart}`, title: `${comp1} lanzó campaña masiva en medios digitales`, description: 'Estimado de alta inversión en paid. Audiencias en segmento clave directo.', competitor: comp1 },
      { icon: '📰', color: '#BA7517', borderColor: '#FAC775', category: 'MEDIOS · ALTO', date: `Mar · ${periodStart}`, title: `${comp1} mencionado en medios tier-1`, description: 'Artículo de fondo con posicionamiento como líder innovador del sector.', competitor: comp1 },
      { icon: '🤝', color: '#534AB7', borderColor: '#CECBF6', category: 'ALIANZA · MEDIO', date: `Jue · ${periodEnd}`, title: `${comp4} firmó convenio estratégico`, description: 'Acceso a nueva base de clientes a través de distribución directa.', competitor: comp4 },
    ],

    // Página 6
    priceTrends: [
      { name: comp1, change: '↓ −12%', color: '#E24B4A' },
      { name: comp2, change: '→ Estable', color: '#888' },
      { name: comp3, change: '↑ +5%', color: '#1D9E75' },
      { name: comp4, change: '↓ −8%', color: '#E24B4A' },
    ],
    priceTrendAlert: `⚠ Señal de guerra de precios en sector ${industry}`,
    dominantMessages: [
      { competitor: comp1.toUpperCase(), color: '#534AB7', message: 'Tu dinero merece más. Sin comisiones, sin complicaciones.' },
      { competitor: comp2.toUpperCase(), color: '#BA7517', message: 'Soluciones inteligentes para líderes empresariales.' },
      { competitor: comp3.toUpperCase(), color: '#1D9E75', message: 'Invierte como los expertos, desde tu celular, hoy mismo.' },
    ],
    targetSegments: [
      { name: 'SEGMENTO PRINCIPAL', pct: 85, color: '#1D9E75', bg: '#EAF3DE', trackColor: '#C0DD97', desc: `3 de ${competitorsCount} competidores enfocados aquí` },
      { name: 'PYMES Y EMPRESARIOS', pct: 60, color: '#BA7517', bg: '#FAEEDA', trackColor: '#FAC775', desc: 'Creciente, competidor 2 lidera' },
      { name: 'MID-MARKET CORPORATIVO', pct: 30, color: '#534AB7', bg: '#F8F7FF', trackColor: '#CECBF6', desc: 'Poco explorado — oportunidad' },
    ],
    newChannels: [
      { icon: '📲', channel: 'WhatsApp Business API', desc: `${comp1} · Atención y ventas directas` },
      { icon: '🏪', channel: 'Distribución en puntos de venta', desc: `${comp4} · Miles de puntos de venta` },
      { icon: '💼', channel: 'LinkedIn Ads B2B', desc: `${comp2} · Segmento ejecutivo` },
    ],
    rivalAdvantages: [
      { icon: '🥇', text: 'Precio más bajo del mercado post-ajuste', bg: '#FCEBEB', border: '#F7C1C1', textColor: '#A32D2D' },
      { icon: '🥇', text: 'Mayor inversión publicitaria visible', bg: '#FCEBEB', border: '#F7C1C1', textColor: '#A32D2D' },
      { icon: '🥇', text: 'Cobertura en medios tier-1 del sector', bg: '#FCEBEB', border: '#F7C1C1', textColor: '#A32D2D' },
      { icon: '✅', text: 'Tu ventaja: servicio personalizado + retención superior', bg: '#EAF3DE', border: '#C0DD97', textColor: '#27500A' },
    ],

    // Página 7
    opportunitiesCount: 4,
    opportunities: [
      { icon: '🏘️', type: 'Nicho sin cobertura rival', title: `${industry} · Zona Norte`, description: 'Ningún competidor directo tiene presencia activa en mercados clave. Ventana de oportunidad abierta con mercado estimado de cientos de miles de clientes potenciales.', score: 92, headerBg: '#1D9E75', border: '#C0DD97', accentColor: '#1D9E75', window: '30-45 días', actionBg: '#EAF3DE', actionColor: '#27500A', actionLabel: 'ACTUAR YA' },
      { icon: '😤', type: 'Clientes vulnerables', title: `Clientes insatisfechos de ${comp4}`, description: `Spike de reseñas negativas detectado. Oportunidad de captación directa con campaña comparativa y propuesta de migración facilitada.`, score: 88, headerBg: '#1D9E75', border: '#C0DD97', accentColor: '#1D9E75', window: '15-20 días', actionBg: '#EAF3DE', actionColor: '#27500A', actionLabel: 'ACTUAR YA' },
      { icon: '🔍', type: 'Keywords sin dominar', title: 'SEO — Términos de alto volumen disponibles', description: `Múltiples términos de búsqueda con alto volumen mensual en el sector ${industry} sin competidor posicionado en top 3 de resultados.`, score: 81, headerBg: '#27896A', border: '#9FE1CB', accentColor: '#27896A', window: '60-90 días', actionBg: '#D0EFDF', actionColor: '#085041', actionLabel: 'PLANIFICAR' },
      { icon: '📦', type: 'Productos desatendidos', title: 'Segmento PYME sin solución específica', description: 'Ningún competidor ofrece solución específica para PYME con mínimos accesibles. Segmento de cientos de miles de empresas en LATAM sin atender.', score: 76, headerBg: '#27896A', border: '#9FE1CB', accentColor: '#27896A', window: '45-60 días', actionBg: '#D0EFDF', actionColor: '#085041', actionLabel: 'PLANIFICAR' },
    ],
    rivalWeaknesses: [
      { competitor: comp1.toUpperCase(), color: '#FF6B6B', weakness: 'Soporte al cliente deficiente. NPS bajo vs industria. Oportunidad: campaña de servicio superior.' },
      { competitor: comp2.toUpperCase(), color: '#F2C063', weakness: 'Sin presencia consolidada en nuevos mercados aún. Ventana de 90 días para adelantarlos.' },
      { competitor: comp3.toUpperCase(), color: '#8B7BFF', weakness: 'Interfaz compleja. Alta tasa de abandono en onboarding. Tu UX simplificada es ventaja directa.' },
    ],

    // Página 8
    highRisksCount: 3,
    mediumRisksCount: 4,
    highRisks: [
      { icon: '⚔️', title: 'Guerra de precios inminente', probability: 85, description: `${comp1} ya inició reducción. Si otros replican, podrías perder 15-20% de leads en segmento precio-sensible. Riesgo de erosión de margen sin respuesta coordinada.`, mitigation: 'Proteger con valor agregado antes que con precio', impact: 9, impactDash: 136, impactGap: 15 },
      { icon: '🚀', title: 'Nuevo jugador fuerte entrando', probability: 70, description: 'Startup nueva con respaldo de inversión en proceso de registro. Fundadores con track record probado. Podría capturar 8-12% del mercado en 12 meses.', mitigation: 'Acelerar captación y fidelización antes de su lanzamiento', impact: 7, impactDash: 106, impactGap: 45 },
      { icon: '📉', title: 'Pérdida de share digital acelerada', probability: 65, description: `Competidores incrementaron inversión digital significativamente. Si no se contrarresta, el share of voice podría caer en los próximos 60 días.`, mitigation: 'Incrementar presencia orgánica y fortalecer comunidad propia', impact: 6, impactDash: 90, impactGap: 61 },
    ],
    mediumRisks: [
      { icon: '🤝', title: 'Alianza estratégica rival', description: `Si se confirma alianza detectada de ${comp1}, daría acceso a millones de clientes adicionales. Impacto potencial de +30% en captación rival.` },
      { icon: '📋', title: 'Cambio regulatorio sectorial', description: 'Nueva normativa en consulta pública. Podría requerir adecuaciones operativas y capital adicional.' },
      { icon: '👋', title: 'Fuga de talento clave', description: `Competidores reclutan perfiles similares a tu equipo tech con sobreprecio de +35%. Plan de retención urgente recomendado.` },
      { icon: '📣', title: 'Saturación de anuncios', description: 'CPL aumentó 28% en canales digitales por mayor competencia en el segmento. Eficiencia publicitaria en riesgo.' },
    ],

    // Página 9
    benchmarkFactors: 8,
    benchmarkCompetitors: [{ name: comp1 }, { name: comp2 }, { name: comp3 }],
    benchmarkRowsHTML: `
  <tr><td style="font-size:11px;font-weight:600;color:#1A1730">💰 Precio</td><td style="text-align:center"><span style="background:#FAEEDA;color:#854F0B;font-size:10px;font-weight:700;padding:2px 8px;border-radius:7px">MEDIO</span></td><td style="text-align:center;font-size:10px;color:#E24B4A;font-weight:700">BAJO ↓</td><td style="text-align:center;font-size:10px;color:#888;font-weight:700">MEDIO</td><td style="text-align:center;font-size:10px;color:#1D9E75;font-weight:700">ALTO ↑</td><td style="text-align:center;font-size:9px;color:#BA7517;font-weight:700">2° lugar</td></tr>
  <tr style="background:#FAFAFA"><td style="font-size:11px;font-weight:600;color:#1A1730">⭐ Servicio al cliente</td><td style="text-align:center"><span style="background:#EAF3DE;color:#27500A;font-size:10px;font-weight:700;padding:2px 8px;border-radius:7px">ALTO ✓</span></td><td style="text-align:center;font-size:10px;color:#888;font-weight:700">BAJO</td><td style="text-align:center;font-size:10px;color:#888;font-weight:700">MEDIO</td><td style="text-align:center;font-size:10px;color:#888;font-weight:700">MEDIO</td><td style="text-align:center;font-size:9px;color:#1D9E75;font-weight:700">🥇 Líder</td></tr>
  <tr><td style="font-size:11px;font-weight:600;color:#1A1730">💡 Innovación</td><td style="text-align:center"><span style="background:#FAEEDA;color:#854F0B;font-size:10px;font-weight:700;padding:2px 8px;border-radius:7px">MEDIO</span></td><td style="text-align:center;font-size:10px;color:#1D9E75;font-weight:700">ALTO</td><td style="text-align:center;font-size:10px;color:#1D9E75;font-weight:700">ALTO ↑</td><td style="text-align:center;font-size:10px;color:#888;font-weight:700">MEDIO</td><td style="text-align:center;font-size:9px;color:#BA7517;font-weight:700">3° lugar</td></tr>
  <tr style="background:#FAFAFA"><td style="font-size:11px;font-weight:600;color:#1A1730">🚀 Velocidad</td><td style="text-align:center"><span style="background:#EAF3DE;color:#27500A;font-size:10px;font-weight:700;padding:2px 8px;border-radius:7px">ALTO ✓</span></td><td style="text-align:center;font-size:10px;color:#888;font-weight:700">MEDIO</td><td style="text-align:center;font-size:10px;color:#1D9E75;font-weight:700">ALTO</td><td style="text-align:center;font-size:10px;color:#888;font-weight:700">BAJO</td><td style="text-align:center;font-size:9px;color:#1D9E75;font-weight:700">🥇 Líder</td></tr>
  <tr><td style="font-size:11px;font-weight:600;color:#1A1730">🏆 Marca</td><td style="text-align:center"><span style="background:#FAEEDA;color:#854F0B;font-size:10px;font-weight:700;padding:2px 8px;border-radius:7px">MEDIO</span></td><td style="text-align:center;font-size:10px;color:#1D9E75;font-weight:700">ALTO</td><td style="text-align:center;font-size:10px;color:#888;font-weight:700">MEDIO</td><td style="text-align:center;font-size:10px;color:#888;font-weight:700">MEDIO</td><td style="text-align:center;font-size:9px;color:#BA7517;font-weight:700">2° lugar</td></tr>
  <tr style="background:#FAFAFA"><td style="font-size:11px;font-weight:600;color:#1A1730">📊 NPS</td><td style="text-align:center"><span style="background:#EAF3DE;color:#27500A;font-size:10px;font-weight:700;padding:2px 8px;border-radius:7px">68 ✓</span></td><td style="text-align:center;font-size:10px;color:#E24B4A;font-weight:700">31</td><td style="text-align:center;font-size:10px;color:#888;font-weight:700">54</td><td style="text-align:center;font-size:10px;color:#888;font-weight:700">47</td><td style="text-align:center;font-size:9px;color:#1D9E75;font-weight:700">🥇 Líder</td></tr>
  <tr><td style="font-size:11px;font-weight:600;color:#1A1730">🔄 Retención</td><td style="text-align:center"><span style="background:#EAF3DE;color:#27500A;font-size:10px;font-weight:700;padding:2px 8px;border-radius:7px">92% ✓</span></td><td style="text-align:center;font-size:10px;color:#888;font-weight:700">78%</td><td style="text-align:center;font-size:10px;color:#888;font-weight:700">82%</td><td style="text-align:center;font-size:10px;color:#888;font-weight:700">74%</td><td style="text-align:center;font-size:9px;color:#1D9E75;font-weight:700">🥇 Líder</td></tr>
  <tr style="background:#FAFAFA"><td style="font-size:11px;font-weight:600;color:#1A1730">🌍 Cobertura</td><td style="text-align:center"><span style="background:#FAEEDA;color:#854F0B;font-size:10px;font-weight:700;padding:2px 8px;border-radius:7px">REGIONAL</span></td><td style="text-align:center;font-size:10px;color:#1D9E75;font-weight:700">INTER.</td><td style="text-align:center;font-size:10px;color:#888;font-weight:700">REGIONAL</td><td style="text-align:center;font-size:10px;color:#888;font-weight:700">NAC.</td><td style="text-align:center;font-size:9px;color:#BA7517;font-weight:700">2° lugar</td></tr>
`,
    radarPoints: '0,-56 49,-20 55,28 0,65 -55,28 -46,-24',
    strengths: ['NPS más alto del sector', 'Retención de clientes líder', 'Servicio al cliente superior'],
    improvements: ['Innovación por debajo de líderes', 'Cobertura geográfica limitada', 'Presupuesto publicitario reducido'],

    // Página 10
    highPriorityRecs: [
      { number: 1, title: 'Ajustar pricing línea premium esta semana', owner: 'CEO + CFO', deadline: '5 días', description: `Revisar estructura de precios. Opción A: mantener precio + agregar beneficios de valor. Opción B: bajar 5-8% solo en plan de entrada. No reaccionar con guerra de precios directa frente a ${comp1}.`, impact: '+12% retención leads' },
      { number: 2, title: `Campaña de retención top 50 clientes estratégicos`, owner: 'Dir. Comercial', deadline: '7 días', description: `Contacto directo 1-a-1 con top 50 clientes por facturación. Ofrecer revisión personalizada + beneficio exclusivo por lealtad. Objetivo: blindar antes que ${comp2} los contacte con su nueva oferta.`, impact: 'Proteger cartera clave' },
    ],
    mediumPriorityRecs: [
      { number: 3, title: 'Lanzar campaña zona norte', deadline: '14 días', description: 'Activar piloto de captación en mercados sin cobertura rival. Presupuesto mínimo en digital con alto ROI potencial.', impact: '200-400 leads nuevos' },
      { number: 4, title: 'Abrir canal digital adicional', deadline: '10 días', description: 'Activar WhatsApp Business API para atención y ventas. Costo de implementación bajo con ROI estimado en 45 días.', impact: '−30% tiempo de respuesta' },
    ],
    lowPriorityRecs: [
      { number: 5, title: 'Fortalecer propuesta de valor', description: `Actualizar materiales comerciales enfatizando NPS 68 y retención 92%. Diferenciadores clave frente a guerra de precios de ${comp1}.` },
      { number: 6, title: 'Blindar talento crítico', description: `Revisar compensaciones del equipo tech y product. ${comp2} recluta activamente perfiles similares con sobreprecio. Plan de retención urgente.` },
    ],

    // Página 11
    weeklyPlans: [], // se inyecta directo como HTML abajo
weeklyPlansHTML: `
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px">
    <div style="border:1.5px solid #F7C1C1;border-radius:12px;overflow:hidden">
      <div style="background:#E24B4A;padding:9px 12px">
        <div style="font-size:8px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:.1em;margin-bottom:2px;text-transform:uppercase">Semana 1 · Primeros 7 días</div>
        <div style="font-size:12px;font-weight:800;color:#fff">Defensa activa</div>
      </div>
      <div style="padding:12px;display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;align-items:flex-start;gap:7px"><div style="width:14px;height:14px;border-radius:50%;background:#FCEBEB;border:2px solid #F7C1C1;flex-shrink:0;margin-top:1px"></div><div style="font-size:10px;color:#444;line-height:1.4">Monitoreo diario pricing ${comp1} — ¿bajan más?</div></div>
        <div style="display:flex;align-items:flex-start;gap:7px"><div style="width:14px;height:14px;border-radius:50%;background:#FCEBEB;border:2px solid #F7C1C1;flex-shrink:0;margin-top:1px"></div><div style="font-size:10px;color:#444;line-height:1.4">Seguimiento contratación ${comp2} — ¿más directivos?</div></div>
        <div style="display:flex;align-items:flex-start;gap:7px"><div style="width:14px;height:14px;border-radius:50%;background:#FCEBEB;border:2px solid #F7C1C1;flex-shrink:0;margin-top:1px"></div><div style="font-size:10px;color:#444;line-height:1.4">Implementar campaña retención top 50 clientes</div></div>
        <div style="display:flex;align-items:flex-start;gap:7px"><div style="width:14px;height:14px;border-radius:50%;background:#FCEBEB;border:2px solid #F7C1C1;flex-shrink:0;margin-top:1px"></div><div style="font-size:10px;color:#444;line-height:1.4">Confirmar o descartar alianza estratégica rival</div></div>
      </div>
    </div>
    <div style="border:1.5px solid #FAC775;border-radius:12px;overflow:hidden">
      <div style="background:#BA7517;padding:9px 12px">
        <div style="font-size:8px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:.1em;margin-bottom:2px;text-transform:uppercase">Semana 2 · 8-14 días</div>
        <div style="font-size:12px;font-weight:800;color:#fff">Expansión y respuesta</div>
      </div>
      <div style="padding:12px;display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;align-items:flex-start;gap:7px"><div style="width:14px;height:14px;border-radius:50%;background:#FAEEDA;border:2px solid #FAC775;flex-shrink:0;margin-top:1px"></div><div style="font-size:10px;color:#444;line-height:1.4">Lanzar piloto captación en mercados sin rival</div></div>
        <div style="display:flex;align-items:flex-start;gap:7px"><div style="width:14px;height:14px;border-radius:50%;background:#FAEEDA;border:2px solid #FAC775;flex-shrink:0;margin-top:1px"></div><div style="font-size:10px;color:#444;line-height:1.4">Seguimiento lanzamiento ${comp3} en nueva región</div></div>
        <div style="display:flex;align-items:flex-start;gap:7px"><div style="width:14px;height:14px;border-radius:50%;background:#FAEEDA;border:2px solid #FAC775;flex-shrink:0;margin-top:1px"></div><div style="font-size:10px;color:#444;line-height:1.4">Activar WhatsApp Business + medir respuesta</div></div>
        <div style="display:flex;align-items:flex-start;gap:7px"><div style="width:14px;height:14px;border-radius:50%;background:#FAEEDA;border:2px solid #FAC775;flex-shrink:0;margin-top:1px"></div><div style="font-size:10px;color:#444;line-height:1.4">Alertas de costo por lead — ¿supera umbrales?</div></div>
      </div>
    </div>
    <div style="border:1.5px solid #CECBF6;border-radius:12px;overflow:hidden">
      <div style="background:#534AB7;padding:9px 12px">
        <div style="font-size:8px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:.1em;margin-bottom:2px;text-transform:uppercase">Semanas 3-4 · 15-30 días</div>
        <div style="font-size:12px;font-weight:800;color:#fff">Consolidación</div>
      </div>
      <div style="padding:12px;display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;align-items:flex-start;gap:7px"><div style="width:14px;height:14px;border-radius:50%;background:#EEEDFE;border:2px solid #CECBF6;flex-shrink:0;margin-top:1px"></div><div style="font-size:10px;color:#444;line-height:1.4">Monitorear nuevo jugador — ¿avanza registro?</div></div>
        <div style="display:flex;align-items:flex-start;gap:7px"><div style="width:14px;height:14px;border-radius:50%;background:#EEEDFE;border:2px solid #CECBF6;flex-shrink:0;margin-top:1px"></div><div style="font-size:10px;color:#444;line-height:1.4">Actualizar landing + materiales comerciales</div></div>
        <div style="display:flex;align-items:flex-start;gap:7px"><div style="width:14px;height:14px;border-radius:50%;background:#EEEDFE;border:2px solid #CECBF6;flex-shrink:0;margin-top:1px"></div><div style="font-size:10px;color:#444;line-height:1.4">Revisión salarios equipo tech — plan retención</div></div>
        <div style="display:flex;align-items:flex-start;gap:7px"><div style="width:14px;height:14px;border-radius:50%;background:#EEEDFE;border:2px solid #CECBF6;flex-shrink:0;margin-top:1px"></div><div style="font-size:10px;color:#444;line-height:1.4">Análisis keywords SEO — iniciar contenido</div></div>
      </div>
    </div>
  </div>
`,
    criticalSignals: [
      `${comp1} baja precios otro −5%`,
      `${comp2} lanza nuevo producto`,
      'Alianza estratégica rival confirmada',
      'Nuevo jugador obtiene registro',
    ],
    importantSignals: [
      'CPL supera umbral crítico',
      'Redes sociales rivales viralizan',
      'Más contrataciones clave rivales',
      'Reseñas negativas sector',
    ],
    infoSignals: [
      'Rankings App Store sector',
      'Menciones en medios tier-2',
      'Keywords SEO movimiento',
      'Cambios regulatorios sectoriales',
    ],
  }
}

// ─── Función principal: generar PDF ──────────────────
export async function generateReport(project: any, outputPath: string): Promise<string> {
  console.log(`📄 Generando reporte para: ${project.companyName || project.name || 'Sin nombre'}`)

  // 1. Cargar template
  const templatePath = path.join(__dirname, '../templates/competitive-report.html')
  const template = fs.readFileSync(templatePath, 'utf-8')

  // 2. Generar datos
  const data = generateDemoData(project)

  // 3. Renderizar HTML
  const html = renderTemplate(template, data)

  // 4. Generar PDF con Puppeteer
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: process.env.NODE_ENV === 'production'
      ? await chromium.executablePath
      : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: chromium.headless,
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    await page.pdf({
      path: outputPath,
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })
    console.log(`✅ PDF generado: ${outputPath}`)
    return outputPath
  } finally {
    await browser.close()
  }
}
