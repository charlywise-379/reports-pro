import { describe, it, expect, vi } from 'vitest'

vi.mock('./prisma', () => ({ prisma: {} }))
vi.mock('./config', () => ({ getSecret: () => undefined }))
vi.mock('./anthropic', () => ({ getAnthropic: () => ({}) }))

import { buildReportData } from './reportEngine'
import { FIXTURE_PROJECT, FIXTURE_DATE_INFO, FIXTURES, LOGOS_STUB } from './reportFixtures'
import { PAGES, resolveReportTemplate, renderReportHtmlV2, buildV2Template } from './reportTemplates'

const render = (fixture: 'normal' | 'extreme' | 'minimal', skin: 'editorial' | 'panel', teaser = false) => {
  const data = buildReportData(FIXTURE_PROJECT, FIXTURES[fixture], FIXTURE_DATE_INFO, 3, teaser)
  return renderReportHtmlV2(skin, data, FIXTURES[fixture], LOGOS_STUB)
}
const count = (html: string, re: RegExp) => (html.match(re) || []).length

describe('resolveReportTemplate', () => {
  it('reconoce editorial y panel sin importar mayúsculas ni espacios', () => {
    expect(resolveReportTemplate('editorial')).toBe('editorial')
    expect(resolveReportTemplate(' Panel ')).toBe('panel')
  })
  it('cualquier otro valor o ausencia cae en v1', () => {
    expect(resolveReportTemplate(undefined)).toBe('v1')
    expect(resolveReportTemplate('')).toBe('v1')
    expect(resolveReportTemplate('v2')).toBe('v1')
    expect(resolveReportTemplate('cualquier-cosa')).toBe('v1')
  })
})

describe('renderReportHtmlV2', () => {
  for (const skin of ['editorial', 'panel'] as const) {
    for (const fixture of ['normal', 'extreme', 'minimal'] as const) {
      it(`${skin}/${fixture}: una página por parcial, sin marcadores sin resolver`, () => {
        const html = render(fixture, skin)
        expect(count(html, /<div class="page[ "]/g)).toBe(PAGES.length)
        expect(html).not.toMatch(/\{\{/)
        expect(html).toContain(`<body class="skin-${skin}">`)
        expect(html).toContain('@font-face')
        expect(html).toContain('<title>')
      })
    }
  }

  it('escapa HTML que venga de la IA', () => {
    const ai = { ...FIXTURES.normal, generalTrend: '<script>alert(1)</script> & "x"' }
    const data = buildReportData(FIXTURE_PROJECT, ai, FIXTURE_DATE_INFO, 3, false)
    const html = renderReportHtmlV2('panel', data, ai, LOGOS_STUB)
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('portada en la primera página y nombre de la empresa', () => {
    const html = render('normal', 'editorial')
    expect(html).toContain('Estudio Boreal')
    expect(html.indexOf('class="page page--dark"')).toBeGreaterThan(-1)
  })

  it('la portada muestra los 4 competidores y ninguna regla CSS oculta filas', () => {
    const html = render('normal', 'panel')
    for (const name of ['Atlas Creativo', 'Norte Digital', 'Pixel &amp; Co', 'Marea Studio']) {
      expect(html).toContain(name)
    }
    expect(buildV2Template()).not.toMatch(/nth-child\(n\+\d+\)\s*\{\s*display:\s*none/)
  })
})

describe('regla .chip', () => {
  const rule = (buildV2Template().match(/\.chip\{([^}]*)\}/) || [])[1] || ''
  it('trunca con puntos suspensivos y no usa inline-flex', () => {
    expect(rule).toContain('text-overflow:ellipsis')
    expect(rule).not.toContain('display:inline-flex')
  })
})

describe('teaser', () => {
  it('marca el body, mantiene la regla de desenfoque desde la página 6 y la capa en cada página', () => {
    const html = render('normal', 'panel', true)
    expect(html).toContain('<body class="is-teaser skin-panel">')
    expect(html).toContain('.page:nth-of-type(n+6) .page-content{filter:blur(6px)}')
    expect(count(html, /<div class="teaser-overlay">/g)).toBe(PAGES.length)
    const plain = render('normal', 'panel', false)
    expect(plain).toContain('<body class="skin-panel">')
  })
})

describe('clamps de páginas 4 y 5', () => {
  it('no sobreescribe -webkit-line-clamp desde pages.css (el valor vive en la clase clamp-N)', () => {
    expect(buildV2Template()).not.toMatch(/\.(alerts|tl-item)[^{]*\{[^}]*-webkit-line-clamp/)
  })
})

describe('página 9 (riesgos)', () => {
  const pages = (html: string) => html.split(/<div class="page(?: page--dark)?"><div class="page-content">/).slice(1)
  it('el título del riesgo alto admite 2 líneas y no repite la etiqueta PROBABILIDAD por tarjeta', () => {
    const p9 = pages(render('normal', 'editorial'))[8]
    expect(p9).toContain('class="clamp-2">Pérdida de clientes por precio')
    expect(p9).not.toMatch(/risk-head[\s\S]*?PROBABILIDAD/i)
    expect(p9).toContain('el porcentaje indica la probabilidad')
  })
})

describe('logos', () => {
  const pages = (html: string) => html.split(/<div class="page(?: page--dark)?"><div class="page-content">/).slice(1)
  it('la portada oscura usa el logo para fondo oscuro y las páginas claras el de fondo claro', () => {
    const [cover, second] = pages(render('normal', 'editorial'))
    expect(cover).toContain(LOGOS_STUB.onDark)
    expect(cover).not.toContain(LOGOS_STUB.onLight)
    expect(second).toContain(LOGOS_STUB.onLight)
    expect(second).not.toContain(LOGOS_STUB.onDark)
  })
  it('no quedan referencias al marcador antiguo', () => {
    expect(render('normal', 'panel')).not.toContain('logoBase64')
  })
})

describe('estructura final', () => {
  it('el reporte tiene exactamente 11 páginas en el orden esperado', () => {
    expect(PAGES).toHaveLength(11)
    expect(PAGES.map(p => p.file)).toEqual([
      'p01-portada.html', 'p02-termometro.html', 'p03-competidores.html', 'p04-alertas.html',
      'p05-cambios.html', 'p06-radar.html', 'p07-comercial.html', 'p08-oportunidades.html',
      'p09-riesgos.html', 'p10-benchmark.html', 'p11-recomendaciones.html',
    ])
  })
  it('la paginación usa el total del view-model', () => {
    const html = render('normal', 'editorial')
    expect(html).toContain('data-total="11"')
    expect(count(html, /class="pg"/g)).toBe(11)
  })
})
