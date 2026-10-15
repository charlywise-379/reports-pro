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
  dark?: boolean
}

export const PAGES: PageDef[] = [
  { file: 'p01-portada.html', dark: true },
  { file: 'p02-termometro.html', eyebrow: 'Panorama', title: 'Termómetro del mercado', sub: 'Estado general del ecosistema competitivo · {{periodStart}} — {{periodEnd}}' },
  { file: 'p03-competidores.html', eyebrow: 'Competidores', title: 'Competidores con más actividad', sub: 'Ordenados por amenaza real · Reporte #{{edition}}' },
  { file: 'p04-alertas.html', eyebrow: 'Alertas', title: 'Alertas de la semana', sub: 'Lo que requiere atención primero · {{periodStart}} — {{periodEnd}}' },
  { file: 'p05-cambios.html', eyebrow: 'Movimientos', title: 'Cambios detectados', sub: '{{totalChanges}} cambios entre {{periodStart}} y {{periodEnd}}' },
  { file: 'p06-radar.html', eyebrow: 'Monitoreo', title: 'Tu radar de monitoreo', sub: 'Qué vigilamos y qué sigue · {{nextMonth}}' },
  { file: 'p07-comercial.html', eyebrow: 'Mercado', title: 'Inteligencia comercial', sub: 'Dónde están ganando tus competidores · Reporte #{{edition}}' },
  { file: 'p08-oportunidades.html', eyebrow: 'Oportunidades', title: 'Dónde ganar ahora', sub: '{{opportunitiesCount}} oportunidades identificadas · puntaje de mercado {{opportunityScore}}/100' },
  { file: 'p09-riesgos.html', eyebrow: 'Riesgos', title: 'Qué puede golpear los ingresos', sub: '{{highRisksCount}} riesgos altos · {{mediumRisksCount}} medios · el porcentaje indica la probabilidad' },
  { file: 'p10-benchmark.html', eyebrow: 'Benchmark', title: 'Benchmark estratégico', sub: 'Tu empresa frente al mercado · semana {{weekNumber}}' },
  { file: 'p11-recomendaciones.html', eyebrow: 'Plan de acción', title: 'Recomendaciones ejecutables', sub: 'Acciones con responsable, plazo e impacto esperado' },
]

const V2_DIR = path.join(__dirname, '../templates/v2')
const read = (rel: string): string => fs.readFileSync(path.join(V2_DIR, rel), 'utf-8')

function wrapPage(def: PageDef, inner: string): string {
  const logo = def.dark ? '{{logoOnDark}}' : '{{logoOnLight}}'
  const sec = def.title
    ? `<div class="sec"><div class="eyebrow">${def.eyebrow ?? ''}</div><h2>${def.title}</h2>${def.sub ? `<p>${def.sub}</p>` : ''}</div>`
    : ''
  return (
    `<div class="page${def.dark ? ' page--dark' : ''}"><div class="page-content">` +
    `<div class="hdr"><div class="brand"><img src="${logo}" alt="Omni Reports"><small>Inteligencia competitiva</small></div>` +
    `<div class="hdr-meta">{{companyName}} · Reporte #{{edition}} · {{year}}</div></div>` +
    sec +
    `<div class="body"><div class="fit">${inner}</div></div>` +
    `<div class="footer"><span>Omni Reports · Confidencial · No distribuir</span><span class="pg" data-total="{{totalPages}}"></span></div>` +
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
