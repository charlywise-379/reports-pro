import { describe, it, expect, vi } from 'vitest'
import fs from 'fs'
import path from 'path'

vi.mock('./prisma', () => ({ prisma: {} }))
vi.mock('./config', () => ({ getSecret: () => undefined }))
vi.mock('./anthropic', () => ({ getAnthropic: () => ({}) }))

import { buildReportData, buildPdfRequestBody } from './reportEngine'
import { FIXTURE_PROJECT, FIXTURE_DATE_INFO, FIXTURES, FixtureName, fixtureProject, LOGOS_STUB } from './reportFixtures'
import { PAGES, resolveReportTemplate, renderReportHtmlV2, buildV2Template } from './reportTemplates'

const render = (fixture: FixtureName, skin: 'editorial' | 'panel', teaser = false) => {
  const data = buildReportData(fixtureProject(fixture), FIXTURES[fixture], FIXTURE_DATE_INFO, 3, teaser)
  return renderReportHtmlV2(skin, data, FIXTURES[fixture], LOGOS_STUB)
}
const count = (html: string, re: RegExp) => (html.match(re) || []).length
const pagesOf = (html: string) => html.split(/<div class="page(?: page--dark)?"><div class="page-content">/).slice(1)

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
    for (const fixture of ['normal', 'extreme', 'minimal', 'real'] as const) {
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

  it('la portada muestra los 5 competidores primarios y ninguna regla CSS oculta filas', () => {
    const cover = pagesOf(render('normal', 'panel'))[0]
    for (const name of ['Atlas Creativo', 'Norte Digital', 'Pixel &amp; Co', 'Marea Studio', 'Faro Agencia']) {
      expect(cover).toContain(name)
    }
    expect(buildV2Template()).not.toMatch(/nth-child\(n\+\d+\)\s*\{\s*display:\s*none/)
  })

  it('portada con datos reales: 3 hallazgos, 3 acciones y 5 competidores con su texto completo', () => {
    const cover = pagesOf(render('real', 'editorial'))[0]
    const ai = FIXTURES.real
    const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
    for (const i of ai.insights.slice(0, 3)) expect(cover).toContain(esc(i.text))
    for (const a of ai.actions.slice(0, 3)) expect(cover).toContain(esc(a.text))
    for (const c of ai.competitors.slice(0, 5)) expect(cover).toContain(`${esc(c.name)}</span><span class="mono tone-text">${c.threat}/10`)
  })
})

describe('regla .chip', () => {
  const rule = (buildV2Template().match(/\.chip\{([^}]*)\}/) || [])[1] || ''
  it('envuelve el texto: sin overflow:hidden, white-space:normal y sin inline-flex', () => {
    expect(rule).not.toContain('overflow:hidden')
    expect(rule).toContain('white-space:normal')
    expect(rule).not.toContain('display:inline-flex')
  })
})

describe('sin recortes con puntos suspensivos', () => {
  const tpl = buildV2Template()
  it('el CSS no usa line-clamp (con o sin prefijo) ni text-overflow:ellipsis', () => {
    expect(tpl).not.toContain('-webkit-line-clamp')
    expect(tpl).not.toMatch(/line-clamp/)
    expect(tpl).not.toMatch(/text-overflow\s*:\s*ellipsis/)
  })
  it('el HTML de las páginas no usa clases clamp-N', () => {
    const html = render('normal', 'editorial')
    const body = html.slice(html.indexOf('<body'))
    expect(body).not.toContain('clamp-')
  })
})

describe('ajuste automático al tamaño de la página', () => {
  const tpl = buildV2Template()
  it('incluye el script de ajuste que espera a las fuentes', () => {
    expect(tpl).toContain('fonts.ready')
    expect(tpl).toContain("dataset.fit = 'done'")
  })
  it('cada página envuelve su contenido en .fit', () => {
    expect(count(render('normal', 'panel'), /class="fit"/g)).toBe(PAGES.length)
  })
  it('los bloques que crecen dentro de .fit no se encogen por debajo de su contenido (min-height:0 esconde el desborde al ajuste)', () => {
    const css = tpl.replace(/\/\*[\s\S]*?\*\//g, '')
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    const bad = rules.filter(m => /flex:1(?![.\d])/.test(m[2]) && /min-height:0/.test(m[2])).map(m => m[1].trim())
    expect(bad.sort()).toEqual(['.body', '.page-content'])
  })
  it('.body aísla su tamaño (contain:size) para que el .fit ampliado no achique el PDF al imprimir', () => {
    expect(tpl).toMatch(/\.body\{[^}]*contain:size/)
  })
  it('el CSS escala .fit con la variable --z', () => {
    expect(tpl).toMatch(/\.fit\{[^}]*transform:scale\(var\(--z/)
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

describe('página 9 (riesgos)', () => {
  const pages = (html: string) => html.split(/<div class="page(?: page--dark)?"><div class="page-content">/).slice(1)
  it('muestra el título del riesgo alto y no repite la etiqueta PROBABILIDAD por tarjeta', () => {
    const p9 = pages(render('normal', 'editorial'))[8]
    expect(p9).toContain('Pérdida de clientes por precio')
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
  it('.recs no oculta contenido con overflow:hidden', () => {
    const css = buildV2Template().replace(/\/\*[\s\S]*?\*\//g, '')
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    const bad = rules.filter(m => m[1].split(',').some(sel => sel.trim() === '.recs') && /overflow(-y)?\s*:\s*hidden/.test(m[2]))
    expect(bad).toHaveLength(0)
  })
})

describe('página 3 (competidores)', () => {
  it('ya no tiene la columna «Giro» (repetía el giro del cliente en cada fila)', () => {
    for (const fx of ['normal', 'real'] as const) {
      const p3 = pagesOf(render(fx, 'panel'))[2]
      expect(p3).toContain('<th>Competidor</th>')
      expect(p3).not.toMatch(/<th[^>]*>Giro<\/th>/)
    }
  })
})

describe('página 10 (benchmark)', () => {
  it('con datos reales muestra las 9 filas, el rango y la nota de posición completa', () => {
    const p10 = pagesOf(render('real', 'editorial'))[9]
    expect(p10).toContain('class="tbl bench cols-5"')
    expect(count(p10, /<td class="bp /g)).toBe(9)
    expect(p10).toContain('<div class="mono tone-text pos-rank">6to lugar</div><div class="sm muted pos-note">invisibilidad crítica</div>')
    expect(p10).toContain('<div class="sm muted pos-note">empate con mayoría</div>')
    expect(p10).toContain('No aparece en primeros 20 resultados búsquedas clave')
    expect(p10).toContain('Etiquetas industriales/comerciales B2B')
  })
  it('oculta columnas vacías solo con clases del marcado', () => {
    const p10 = pagesOf(render('minimal', 'panel'))[9]
    expect(p10).toContain('class="tbl bench cols-1"')
    expect(buildV2Template()).toMatch(/\.bench\.cols-1 \.bc2/)
  })
})

describe('fix 1: posición visible y competidores completos', () => {
  const real = (ai: any) => {
    const data = buildReportData(fixtureProject('real'), ai, FIXTURE_DATE_INFO, 1, false)
    return renderReportHtmlV2('panel', data, ai, LOGOS_STUB)
  }
  it('una posición de 30 caracteres sin separador aparece completa en p10', () => {
    const ai = { ...FIXTURES.real, benchmarkRows: FIXTURES.real.benchmarkRows.map((r: any, i: number) => i === 0 ? { ...r, position: 'Por debajo del promedio actual' } : r) }
    const p10 = pagesOf(real(ai))[9]
    expect(p10).toContain('<div class="mono tone-text pos-rank">Por debajo del promedio actual</div>')
  })
  it('.pos-rank no usa white-space:nowrap (el rango largo envuelve)', () => {
    const css = buildV2Template().replace(/\/\*[\s\S]*?\*\//g, '')
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(m => /\.pos-rank/.test(m[1]))
    expect(rules.length).toBeGreaterThan(0)
    for (const m of rules) expect(m[2]).not.toMatch(/white-space\s*:\s*nowrap/)
  })
  it('el ajuste automático también detecta desborde horizontal (scrollWidth)', () => {
    const fn = (buildV2Template().match(/function overflows\(fit\)\s*\{[^}]*\}/) || [''])[0]
    expect(fn).toContain('scrollHeight')
    expect(fn).toContain('scrollWidth')
  })
  it('la portada y la p7 (Actividad de competidores) listan los 5 competidores primarios reales', () => {
    const pages = pagesOf(real(FIXTURES.real))
    const p7 = pages[6]
    const act = p7.slice(p7.indexOf('Actividad de competidores'), p7.indexOf('Canales a explorar'))
    for (const c of FIXTURES.real.competitors.slice(0, 5)) {
      const name = c.name.replace(/&/g, '&amp;')
      expect(pages[0]).toContain(name)
      expect(act).toContain(`<b>${name}</b>`)
    }
  })
})


describe('pre-desenfoque del teaser (PDF liviano)', () => {
  const tpl = buildV2Template()
  it('incluye los marcadores del script', () => {
    for (const m of ['foreignObject', 'XMLSerializer', 'image/jpeg', 'dataset.blur']) expect(tpl).toContain(m)
  })
  it('solo actúa con is-teaser y marca skipped en caso contrario', () => {
    expect(tpl).toContain("classList.contains('is-teaser')")
    expect(tpl).toContain("dataset.blur = 'skipped'")
    expect(tpl).toContain("dataset.blur = 'pending'")
    expect(tpl).toContain("dataset.blur = 'done'")
    expect(tpl).toContain("dataset.blur = 'failed'")
  })
  it('conserva la regla CSS de desenfoque como respaldo', () => {
    expect(tpl).toContain('.page:nth-of-type(n+6) .page-content{filter:blur(6px)}')
  })
  it('no procesa dos veces una página', () => {
    expect(tpl).toContain('data-prebl')
  })
})

describe('buildPdfRequestBody', () => {
  it('conserva html y opciones y espera al script de la página', () => {
    const body = buildPdfRequestBody('<p>x</p>')
    expect(body.html).toBe('<p>x</p>')
    expect(body.options).toEqual({ format: 'A4', landscape: true, printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } })
    expect(body.waitForFunction.timeout).toBe(20000)
    expect(body.waitForFunction.fn).toContain('dataset.blur')
    expect(body.waitForFunction.fn).toContain("'pending'")
    expect(body.waitForFunction.fn).toContain('is-teaser')
    expect(body.waitForFunction.fn).toContain('.fit')
    expect(body.bestAttempt).toBe(true)
  })
})

describe('v1 no se bloquea con la espera de Browserless', () => {
  it('v1 no tiene .fit, así que la función de espera termina sin data-blur', () => {
    const v1 = fs.readFileSync(path.join(__dirname, '../templates/competitive-report.html'), 'utf-8')
    expect(v1).not.toMatch(/class="fit"/)
  })
})

describe('pre-desenfoque: protección contra bloqueos', () => {
  const tpl = buildV2Template()
  it('tiene un watchdog con setTimeout que marca failed si el estado no se resuelve', () => {
    expect(tpl).toMatch(/WATCHDOG_MS\s*=\s*12000/)
    expect(tpl).toMatch(/setTimeout\(function \(\) \{[^}]*dataset\.blur = 'failed'/)
  })
  it('tiene un plazo total menor que el timeout de Browserless (20000) y menor que el watchdog', () => {
    const total = Number(/TOTAL_DEADLINE_MS\s*=\s*(\d+)/.exec(tpl)?.[1])
    const wd = Number(/WATCHDOG_MS\s*=\s*(\d+)/.exec(tpl)?.[1])
    const img = Number(/LOAD_TIMEOUT_MS\s*=\s*(\d+)/.exec(tpl)?.[1])
    expect(total).toBeLessThan(wd)
    expect(wd).toBeLessThan(20000)
    expect(img).toBeLessThanOrEqual(3000)
  })
  it('envuelve fitAll en try/finally y revisa failed entre páginas', () => {
    expect(tpl).toMatch(/try \{ fitAll\(\); \} finally/)
    expect(tpl).toContain("dataset.blur === 'failed'")
  })
  it('maybeBlur y preBlur salen si ya es failed, antes de escribir pending', () => {
    for (const fn of ['maybeBlur', 'preBlur']) {
      const body = tpl.slice(tpl.indexOf(`function ${fn}()`))
      const iGuard = body.indexOf('if (blurFailed()) return')
      const iPending = body.indexOf("dataset.blur = 'pending'")
      expect(iGuard).toBeGreaterThan(-1)
      if (fn === 'preBlur') expect(iGuard).toBeLessThan(iPending)
    }
    const mb = tpl.slice(tpl.indexOf('function maybeBlur()'))
    expect(mb.indexOf('if (blurFailed()) return')).toBeLessThan(mb.indexOf('preBlur()'))
  })
})
