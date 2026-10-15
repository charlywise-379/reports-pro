import { describe, it, expect, vi } from 'vitest'

vi.mock('./prisma', () => ({ prisma: {} }))
vi.mock('./config', () => ({ getSecret: () => undefined }))
vi.mock('./anthropic', () => ({ getAnthropic: () => ({}) }))

import { buildReportData } from './reportEngine'
import { FIXTURE_PROJECT, FIXTURE_DATE_INFO, FIXTURES, LOGO_STUB } from './reportFixtures'
import { PAGES, resolveReportTemplate, renderReportHtmlV2, buildV2Template } from './reportTemplates'

const render = (fixture: 'normal' | 'extreme' | 'minimal', skin: 'editorial' | 'panel', teaser = false) => {
  const data = buildReportData(FIXTURE_PROJECT, FIXTURES[fixture], FIXTURE_DATE_INFO, 3, teaser)
  return renderReportHtmlV2(skin, data, FIXTURES[fixture], LOGO_STUB)
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
    const html = renderReportHtmlV2('panel', data, ai, LOGO_STUB)
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
