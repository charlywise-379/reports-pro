// Vista previa visual del reporte v2: renderiza cada página como PNG y verifica que el PDF tenga
// el número esperado de páginas y que ningún cuerpo de página se desborde. Espera a que el ajuste
// automático de shell.html termine (body[data-fit="done"]) e imprime el factor z de cada página reducida.
// Uso: npx tsx scripts/render-report-preview.ts [--skin editorial|panel|all] [--fixture normal|extreme|minimal|real|all] [--teaser]
import fs from 'fs'
import path from 'path'
import puppeteer from 'puppeteer-core'
import { buildReportData } from '../src/lib/reportEngine'
import { renderReportHtmlV2, PAGES } from '../src/lib/reportTemplates'
import { loadReportLogos } from '../src/lib/reportLogos'
import { FIXTURE_DATE_INFO, FIXTURES, FixtureName, fixtureProject } from '../src/lib/reportFixtures'

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : fallback
}
const skins = arg('skin', 'all') === 'all' ? ['editorial', 'panel'] : [arg('skin', 'editorial')]
const fixtures: FixtureName[] = arg('fixture', 'all') === 'all' ? ['normal', 'extreme', 'minimal', 'real'] : [arg('fixture', 'normal') as FixtureName]
const teaser = process.argv.includes('--teaser')

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean) as string[]

async function main() {
  const executablePath = CANDIDATES.find(p => fs.existsSync(p))
  if (!executablePath) throw new Error('No se encontró Chrome/Edge. Define CHROME_PATH.')
  const browser = await puppeteer.launch({ executablePath, headless: true })
  let failed = false
  try {
    for (const skin of skins) {
      for (const fx of fixtures) {
        const outDir = path.join(__dirname, '..', 'preview-out', `${skin}-${fx}${teaser ? '-teaser' : ''}`)
        fs.mkdirSync(outDir, { recursive: true })
        const data = buildReportData(fixtureProject(fx), FIXTURES[fx], FIXTURE_DATE_INFO, 3, teaser)
        const html = renderReportHtmlV2(skin as any, data, FIXTURES[fx], loadReportLogos())
        fs.writeFileSync(path.join(outDir, 'report.html'), html)

        const page = await browser.newPage()
        await page.setViewport({ width: 1123, height: 794, deviceScaleFactor: 1.5 })
        await page.setContent(html, { waitUntil: 'load' })
        await page.evaluateHandle('document.fonts.ready')
        await page.waitForFunction(() => document.body.dataset.fit === 'done', { timeout: 15000 })

        const pages = await page.$$('.page')
        for (let i = 0; i < pages.length; i++) {
          await pages[i].screenshot({ path: path.join(outDir, `p${String(i + 1).padStart(2, '0')}.png`) })
        }

        // Detecta recortes: cualquier elemento con overflow-y (o overflow-x) hidden/clip cuyo contenido exceda su alto (o ancho) visible.
        // Incluye .fit (si aun en el piso del ajuste no cabe, data-overflow="1"); ignora .body, el marco fijo
        // que contiene a .fit escalado. También junta el factor z de las páginas reducidas.
        const { overflow, zs } = await page.evaluate(() => {
          const out: string[] = []
          const z: string[] = []
          document.querySelectorAll('.page').forEach((p, i) => {
            const fit = p.querySelector('.fit') as HTMLElement | null
            if (fit && Number(fit.dataset.z || '1') < 1) z.push(`p${i + 1} z=${fit.dataset.z}`)
            if (fit && fit.dataset.overflow === '1') out.push(`p${i + 1} .fit en el piso z=${fit.dataset.z} (+${fit.scrollHeight - fit.clientHeight}px, +${fit.scrollWidth - fit.clientWidth}px horizontal)`)
            p.querySelectorAll('*').forEach(el => {
              const h = el as HTMLElement
              if (h.closest('svg') || h.closest('.teaser-overlay') || h.classList.contains('body')) return
              if (h === fit && fit.dataset.overflow === '1') return
              const cs = getComputedStyle(h)
              const sel = `${h.tagName.toLowerCase()}${h.classList[0] ? '.' + h.classList[0] : ''}`
              if (cs.overflowY === 'hidden' || cs.overflowY === 'clip') {
                const excess = h.scrollHeight - h.clientHeight
                if (excess > 1) out.push(`p${i + 1} ${sel} (+${excess}px)`)
              }
              if (cs.overflowX === 'hidden' || cs.overflowX === 'clip') {
                const excessX = h.scrollWidth - h.clientWidth
                if (excessX > 1) out.push(`p${i + 1} ${sel} (+${excessX}px horizontal)`)
              }
            })
          })
          return { overflow: out, zs: z }
        })

        const pdf = await page.pdf({ format: 'A4', landscape: true, printBackground: true, preferCSSPageSize: true })
        const pdfPages = (Buffer.from(pdf).toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length
        fs.writeFileSync(path.join(outDir, 'report.pdf'), pdf)

        const ok = pdfPages === PAGES.length && overflow.length === 0
        if (!ok) failed = true
        console.log(`${ok ? 'OK ' : 'FALLA'} ${skin}/${fx}: ${pdfPages}/${PAGES.length} páginas${overflow.length ? ' · desborde en ' + overflow.join(', ') : ''}`)
        console.log(`     ajuste: ${zs.length ? zs.join(', ') : 'ninguna página reducida'}`)
        await page.close()
      }
    }
  } finally {
    await browser.close()
  }
  if (failed) process.exit(1)
}

main().catch(e => { console.error(e); process.exit(1) })
