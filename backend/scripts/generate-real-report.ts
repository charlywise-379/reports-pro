// Genera un reporte REAL (análisis con IA + búsqueda web) y lo renderiza con los dos diseños v2
// (editorial y panel), completo y en versión gratuita, a partir de UN solo análisis de la IA.
// No escribe en la base de datos (el proyecto es sintético y no se guarda ningún reporte).
// Uso: npx tsx scripts/generate-real-report.ts --spec <spec.json> --out <carpeta> [--ai-json <ai.json>]
//   --ai-json reutiliza un análisis ya guardado (no vuelve a llamar a la IA).
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import puppeteer from 'puppeteer-core'
import { buildReportData, buildPdfRequestBody, callClaudeWithSearch } from '../src/lib/reportEngine'
import { renderReportHtmlV2 } from '../src/lib/reportTemplates'
import { loadReportLogos } from '../src/lib/reportLogos'

const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

const mask = (text: string): string => {
  const t = process.env.BLESS_KEY
  return t ? text.split(t).join('***') : text
}

function buildProject(spec: any): any {
  const additionalContext = JSON.stringify({
    directCompetitors: spec.directCompetitors,
    indirectCompetitors: spec.indirectCompetitors || [],
    differentiators: spec.differentiators || [],
    pitch: spec.pitch || '',
  })
  return {
    id: spec.id || 'sample-project',
    name: `${spec.companyName} — Inteligencia Competitiva`,
    companyName: spec.companyName,
    frequency: 'WEEKLY',
    deliveryChannel: 'EMAIL',
    deliveryTime: '07:00',
    setup: {
      companyName: spec.companyName,
      website: spec.website,
      industry: spec.industry,
      targetMarket: spec.targetMarket,
      country: spec.country,
      geographicScope: spec.geographicScope || ['Nacional'],
      focusAreas: spec.focusAreas || [],
      mainProducts: spec.mainProducts || [],
      directCompetitors: spec.directCompetitors.map((c: any) => ({ name: c.name, url: c.url })),
      additionalContext,
    },
  }
}

function buildDateInfo() {
  const now = new Date()
  const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const next = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const tz = 'America/Mexico_City'
  return {
    weekNumber: Math.ceil(now.getDate() / 7) + now.getMonth() * 4,
    year: now.getFullYear(),
    periodStart: periodStart.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: tz }),
    periodEnd: now.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: tz }),
    generatedAt: now.toLocaleDateString('es-MX', { weekday: 'short', hour: '2-digit', minute: '2-digit', timeZone: tz }),
    nextMonth: next.toLocaleDateString('es-MX', { month: 'long', year: 'numeric', timeZone: tz }),
    nextReportDate: next.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz }),
  }
}

async function renderPdf(html: string): Promise<Buffer> {
  const token = process.env.BLESS_KEY
  if (!token) throw new Error('BLESS_KEY no está configurada')
  const response = await fetch(`https://production-sfo.browserless.io/pdf?token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildPdfRequestBody(html)),
  })
  if (!response.ok) {
    const body = mask(await response.text())
    throw new Error(`Browserless error: ${response.status} ${body.slice(0, 500)}`)
  }
  return Buffer.from(await response.arrayBuffer())
}

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean) as string[]

// Imágenes por página + detector de recortes, para revisar con datos reales. Espera a que el ajuste
// automático de shell.html termine (body[data-fit="done"]) y devuelve también el factor z de cada página reducida.
async function screenshots(browser: any, html: string, dir: string): Promise<{ clipped: string[]; zs: string[] }> {
  fs.mkdirSync(dir, { recursive: true })
  const page = await browser.newPage()
  await page.setViewport({ width: 1123, height: 794, deviceScaleFactor: 1.5 })
  await page.setContent(html, { waitUntil: 'load' })
  await page.evaluateHandle('document.fonts.ready')
  await page.waitForFunction(() => document.body.dataset.fit === 'done', { timeout: 15000 })
  await page.waitForFunction(() => document.body.dataset.blur && document.body.dataset.blur !== 'pending', { timeout: 20000 })
  const pages = await page.$$('.page')
  for (let i = 0; i < pages.length; i++) {
    await pages[i].screenshot({ path: path.join(dir, `p${String(i + 1).padStart(2, '0')}.png`) })
  }
  // .fit que aun en el piso no cabe (data-overflow="1") es un recorte real; .body (el marco fijo) se ignora.
  // Revisa el desborde vertical y el horizontal (overflow-x hidden/clip con scrollWidth > clientWidth).
  const result = await page.evaluate(() => {
    const out: string[] = []
    const zs: string[] = []
    document.querySelectorAll('.page').forEach((p, i) => {
      const fit = p.querySelector('.fit') as HTMLElement | null
      if (fit && Number(fit.dataset.z || '1') < 1) zs.push(`p${i + 1} z=${fit.dataset.z}`)
      if (fit && fit.dataset.overflow === '1') out.push(`p${i + 1} .fit en el piso z=${fit.dataset.z} (+${fit.scrollHeight - fit.clientHeight}px, +${fit.scrollWidth - fit.clientWidth}px horizontal)`)
      p.querySelectorAll('*').forEach(el => {
        const h = el as HTMLElement
        if (h.closest('svg') || h.closest('.teaser-overlay') || h.classList.contains('body')) return
        if (h === fit && fit.dataset.overflow === '1') return
        const cs = getComputedStyle(h)
        const sel = `${h.tagName.toLowerCase()}.${(h.className || '').toString().split(' ')[0]}`
        if ((cs.overflowY === 'hidden' || cs.overflowY === 'clip') && h.scrollHeight - h.clientHeight > 1) {
          out.push(`p${i + 1} ${sel} (+${h.scrollHeight - h.clientHeight}px)`)
        }
        if ((cs.overflowX === 'hidden' || cs.overflowX === 'clip') && h.scrollWidth - h.clientWidth > 1) {
          out.push(`p${i + 1} ${sel} (+${h.scrollWidth - h.clientWidth}px horizontal)`)
        }
      })
    })
    return { clipped: out, zs }
  })
  await page.close()
  return result
}

async function main() {
  const specPath = arg('spec')
  const outDir = arg('out')
  if (!specPath || !outDir) throw new Error('Uso: --spec <spec.json> --out <carpeta> [--ai-json <ai.json>]')
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'))
  fs.mkdirSync(outDir, { recursive: true })

  const project = buildProject(spec)
  const dateInfo = buildDateInfo()

  let aiData: any
  const aiJson = arg('ai-json')
  if (aiJson) {
    aiData = JSON.parse(fs.readFileSync(aiJson, 'utf-8'))
    console.log(`Análisis reutilizado de ${aiJson}`)
  } else {
    console.log('Analizando con IA + búsqueda web (puede tardar varios minutos)...')
    aiData = await callClaudeWithSearch(project, dateInfo)
    fs.writeFileSync(path.join(outDir, 'analisis-ia.json'), JSON.stringify(aiData, null, 2))
    console.log(`Análisis guardado en ${path.join(outDir, 'analisis-ia.json')}`)
  }

  const executablePath = CANDIDATES.find(p => fs.existsSync(p))
  const browser = executablePath ? await puppeteer.launch({ executablePath, headless: true }) : null
  const logos = loadReportLogos()
  try {
    for (const skin of ['editorial', 'panel'] as const) {
      for (const teaser of [false, true]) {
        const label = `${skin}-${teaser ? 'gratuito' : 'completo'}`
        const data = buildReportData(project, aiData, dateInfo, 1, teaser)
        const html = renderReportHtmlV2(skin, data, aiData, logos)
        fs.writeFileSync(path.join(outDir, `${label}.html`), html)
        const pdf = await renderPdf(html)
        const pdfPath = path.join(outDir, `reporte-${label}.pdf`)
        fs.writeFileSync(pdfPath, pdf)
        const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length
        let note = ''
        if (browser) {
          const { clipped, zs } = await screenshots(browser, html, path.join(outDir, 'imagenes', label))
          note = (clipped.length ? ` · RECORTES: ${clipped.join(', ')}` : ' · sin recortes') +
            ` · ajuste: ${zs.length ? zs.join(', ') : 'ninguna página reducida'}`
        }
        console.log(`${label}: ${pdf.length} bytes, ${pages} páginas${note}`)
      }
    }
  } finally {
    if (browser) await browser.close()
  }
}

main().catch(e => {
  console.error(mask(String(e?.message ?? e)))
  process.exit(1)
})
