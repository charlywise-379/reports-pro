// Ensambla la plantilla v2: envuelve cada parcial de página con encabezado, pie y capa de teaser,
// incrusta CSS, fuentes y el sprite de íconos, y la pasa por renderTemplate con escape HTML.
import fs from 'fs'
import path from 'path'
import { renderTemplate } from './reportRender'
import { reportFontFaces } from './reportFonts'
import { buildViewModel, Skin } from './reportViewModel'
import { ReportLogos } from './reportLogos'

export type TemplateKind = 'v1' | 'editorial' | 'panel'

export function resolveReportTemplate(value: string | undefined): TemplateKind {
  const v = (value || '').trim().toLowerCase()
  return v === 'editorial' || v === 'panel' ? v : 'v1'
}

export interface PageDef {
  file: string
  eyebrow?: string
  title?: string
  sub?: string
  /** HTML a la derecha del título (contadores o recuadros que v1 muestra en su encabezado). */
  aside?: string
  dark?: boolean
  /** Portada: la página trae su propio encabezado. */
  cover?: boolean
  /** Texto final del pie (v1: «Fin del reporte» en la última página). */
  footerEnd?: string
}

// Estructura y textos idénticos a la plantilla v1 (competitive-report.html); v2 solo cambia el estilo.
export const PAGES: PageDef[] = [
  { file: 'p01-portada.html', dark: true, cover: true },
  { file: 'p02-termometro.html', title: 'Termómetro del Mercado', sub: 'Estado general del ecosistema competitivo · Reporte #{{edition}} · {{year}}' },
  { file: 'p03-competidores.html', title: 'Competidores con más actividad (monitoreo)', sub: 'Ordenados por amenaza real · Reporte #{{edition}} · {{year}}' },
  {
    file: 'p04-alertas.html', eyebrow: 'Página 4 · Early Warning Alerts™', title: 'Alertas de la competencia / Sector y Segmento Competitivo',
    aside: '<span class="chip tone-bad">{{criticalAlertsCount}} alertas críticas</span><span class="chip tone-warn">{{highAlertsCount}} alertas altas</span><span class="chip tone-neutral">{{mediumAlertsCount}} alertas medias</span>',
  },
  { file: 'p05-cambios.html', title: 'Cambios Detectados Esta Semana', sub: '{{totalChanges}} movimientos registrados · Reporte #{{edition}} · {{periodStart}} — {{periodEnd}}' },
  {
    file: 'p06-radar.html', eyebrow: 'Página 6 · Plan Próximos 30 Días', title: 'Tu radar de monitoreo · {{nextMonth}}', sub: 'Qué vigilar · Cuándo actuar · Cómo responder',
    aside: '<div class="aside-box"><div class="label">Próximo reporte</div><b>{{nextReportDate}}</b><div class="sm muted mono">{{nextReportTime}} · {{deliveryChannel}}</div></div>',
  },
  { file: 'p07-comercial.html', title: 'Inteligencia Comercial', sub: 'Dónde están ganando dinero tus competidores · Reporte #{{edition}} · {{year}}' },
  {
    file: 'p08-oportunidades.html', eyebrow: 'Página 8 · Opportunity Score™', title: 'Oportunidades — Dónde ganar ahora', sub: '{{opportunitiesCount}} oportunidades priorizadas · Ventana 30 días',
    aside: '<div class="aside-box tone-ok"><div class="label">Opportunity Score™</div><span class="num num-lg tone-text">{{opportunityScore}}</span><div class="sm muted mono">de 100 · Alto potencial</div></div>',
  },
  {
    file: 'p09-riesgos.html', eyebrow: 'Página 9 · Riesgos Estratégicos', title: 'Riesgos — Qué puede golpear los ingresos', sub: 'Matriz de riesgo · Probabilidad × Impacto · Semana {{weekNumber}}',
    aside: '<div class="aside-box tone-bad"><div class="label">Riesgos altos</div><span class="num num-md tone-text">{{highRisksCount}}</span></div><div class="aside-box tone-warn"><div class="label">Riesgos medios</div><span class="num num-md tone-text">{{mediumRisksCount}}</span></div>',
  },
  { file: 'p10-benchmark.html', title: 'Benchmark Estratégico', sub: 'Tu empresa vs el mercado · 8 factores clave · Semana {{weekNumber}}' },
  { file: 'p11-recomendaciones.html', title: 'Recomendaciones Ejecutables', sub: 'No teoría. Acción inmediata. · Responsable + Tiempo estimado + Impacto', footerEnd: 'Fin del reporte' },
]

const V2_DIR = path.join(__dirname, '../templates/v2')
const read = (rel: string): string => fs.readFileSync(path.join(V2_DIR, rel), 'utf-8')

function wrapPage(def: PageDef, inner: string): string {
  const logo = def.dark ? '{{logoOnDark}}' : '{{logoOnLight}}'
  const hdr = def.cover
    ? ''
    : `<div class="hdr"><div class="brand"><img src="${logo}" alt="Omni Reports"><div><div class="brand-name">Omni Reports · AI Automation</div><small>Inteligencia competitiva</small></div></div>` +
      `<div class="hdr-meta">{{companyName}} · Reporte #{{edition}} · {{year}}<span class="pg" data-total="{{totalPages}}"></span></div></div>`
  const sec = def.title
    ? `<div class="sec"><div class="sec-main">${def.eyebrow ? `<div class="eyebrow">${def.eyebrow}</div>` : ''}<h2>${def.title}</h2>${def.sub ? `<p>${def.sub}</p>` : ''}</div>` +
      `${def.aside ? `<div class="sec-aside">${def.aside}</div>` : ''}</div>`
    : ''
  return (
    `<div class="page${def.dark ? ' page--dark' : ''}"><div class="page-content">` +
    hdr +
    sec +
    `<div class="body"><div class="fit">${inner}</div></div>` +
    `<div class="footer"><span>Omni Reports · Confidencial · No distribuir</span><span>{{companyName}} · Reporte #{{edition}} · {{year}} · <span class="pg" data-total="{{totalPages}}"></span>${def.footerEnd ? ` · ${def.footerEnd}` : ''}</span></div>` +
    `</div><div class="teaser-overlay"><div class="teaser-card"><b>Activa tu suscripción</b><span>para el reporte completo</span></div></div></div>`
  )
}

export function buildV2Template(): string {
  const css = [read('styles/base.css'), read('styles/pages.css'), read('styles/skin-editorial.css'), read('styles/skin-panel.css')].join('\n')
  const pages = PAGES.map(p => wrapPage(p, read(`pages/${p.file}`))).join('\n')
  return read('shell.html')
    .replace('/*__FONTS__*/', () => reportFontFaces())
    .replace('/*__STYLES__*/', () => css)
    .replace('<!--__PAGES__-->', () => pages)
}

export function renderReportHtmlV2(kind: Skin, data: any, aiData: any, logos: ReportLogos): string {
  const vm = buildViewModel(data, aiData, kind)
  return renderTemplate(buildV2Template(), { ...vm, logoOnDark: logos.onDark, logoOnLight: logos.onLight }, { escape: true })
}
