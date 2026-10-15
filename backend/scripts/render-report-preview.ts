// Vista previa visual del reporte v2: renderiza cada página como PNG y verifica que el PDF tenga
// el número esperado de páginas y que ningún cuerpo de página se desborde.
// Uso: npx tsx scripts/render-report-preview.ts [--skin editorial|panel|all] [--fixture normal|extreme|minimal|all] [--teaser]
import fs from 'fs'
import path from 'path'
import puppeteer from 'puppeteer-core'
import { buildReportData } from '../src/lib/reportEngine'
import { renderReportHtmlV2, PAGES } from '../src/lib/reportTemplates'
import { loadReportLogos } from '../src/lib/reportLogos'
import { FIXTURE_PROJECT, FIXTURE_DATE_INFO, FIXTURES } from '../src/lib/reportFixtures'

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : fallback
}
const skins = arg('skin', 'all') === 'all' ? ['editorial', 'panel'] : [arg('skin', 'editorial')]
const fixtures = arg('fixture', 'all') === 'all' ? ['normal', 'extreme', 'minimal'] : [arg('fixture', 'normal')]
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
        const data = buildReportData(FIXTURE_PROJECT, (FIXTURES as any)[fx], FIXTURE_DATE_INFO, 3, teaser)
        const html = renderReportHtmlV2(skin as any, data, (FIXTURES as any)[fx], loadReportLogos())
        fs.writeFileSync(path.join(outDir, 'report.html'), html)

        const page = await browser.newPage()
        await page.setViewport({ width: 1123, height: 794, deviceScaleFactor: 1.5 })
        await page.setContent(html, { waitUntil: 'load' })
        await page.evaluateHandle('document.fonts.ready')

        const pages = await page.$$('.page')
        for (let i = 0; i < pages.length; i++) {
          await pages[i].screenshot({ path: path.join(outDir, `p${String(i + 1).padStart(2, '0')}.png`) })
        }

        // Detecta recortes: cualquier elemento con overflow-y hidden/clip que no sea un line-clamp deliberado
        // y cuyo contenido exceda su alto visible. Incluye .body (scrollHeight > clientHeight).
        const overflow: string[] = await page.evaluate(() => {
          const out: string[] = []
          document.querySelectorAll('.page').forEach((p, i) => {
            p.querySelectorAll('*').forEach(el => {
              const h = el as HTMLElement
              if (h.closest('svg') || h.closest('.teaser-overlay')) return
              const cs = getComputedStyle(h)
              if (cs.overflowY !== 'hidden' && cs.overflowY !== 'clip') return
              const clamp = (cs as any).webkitLineClamp
              if (clamp && clamp !== 'none') return
              const excess = h.scrollHeight - h.clientHeight
              if (excess > 1) out.push(`p${i + 1} ${h.tagName.toLowerCase()}${h.classList[0] ? '.' + h.classList[0] : ''} (+${excess}px)`)
            })
          })
          return out
        })

        const pdf = await page.pdf({ format: 'A4', landscape: true, printBackground: true, preferCSSPageSize: true })
        const pdfPages = (Buffer.from(pdf).toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length
        fs.writeFileSync(path.join(outDir, 'report.pdf'), pdf)

        const ok = pdfPages === PAGES.length && overflow.length === 0
        if (!ok) failed = true
        console.log(`${ok ? 'OK ' : 'FALLA'} ${skin}/${fx}: ${pdfPages}/${PAGES.length} páginas${overflow.length ? ' · desborde en ' + overflow.join(', ') : ''}`)
        await page.close()
      }
    }
  } finally {
    await browser.close()
  }
  if (failed) process.exit(1)
}

main().catch(e => { console.error(e); process.exit(1) })
