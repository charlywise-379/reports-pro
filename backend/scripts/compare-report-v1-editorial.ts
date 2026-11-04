// Comparación visual y de contenido entre la plantilla v1 y la v2 Editorial con los mismos datos.
// Genera preview-out/compare-<fixture>/index.html: cada fila muestra la página N de v1 y de Editorial
// lado a lado (un solo scroll para ambas) y, debajo, las palabras que aparecen en una versión y no en la otra.
// También guarda v1.pdf y editorial.pdf.
// Uso: npx tsx scripts/compare-report-v1-editorial.ts [--fixture normal|extreme|minimal|real|all]
import fs from 'fs'
import path from 'path'
import puppeteer, { Browser } from 'puppeteer-core'
import { buildReportData } from '../src/lib/reportEngine'
import { renderReportHtmlV2 } from '../src/lib/reportTemplates'
import { renderTemplate } from '../src/lib/reportRender'
import { loadReportLogos } from '../src/lib/reportLogos'
import { FIXTURE_DATE_INFO, FIXTURES, FixtureName, fixtureProject } from '../src/lib/reportFixtures'

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : fallback
}
const fixtures: FixtureName[] = arg('fixture', 'all') === 'all' ? ['normal', 'real', 'extreme', 'minimal'] : [arg('fixture', 'real') as FixtureName]

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean) as string[]

function renderV1(data: any): string {
  const template = fs.readFileSync(path.join(__dirname, '../src/templates/competitive-report.html'), 'utf-8')
  const logoBase64 = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '../src/assets/logo-icon.png')).toString('base64')
  return renderTemplate(template, { ...data, logoBase64 })
}

// Palabras normalizadas de cada página (sin encabezado, pie, capa de teaser ni íconos/emojis).
function words(text: string): string[] {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, ' ')
    .split(/[^\p{L}\p{N}%#/+.-]+/u)
    .map(w => w.replace(/^[.\-/]+|[.\-/]+$/g, ''))
    .filter(Boolean)
}
function diff(a: string[], b: string[]): { onlyA: string[]; onlyB: string[] } {
  const count = (l: string[]) => l.reduce((m, w) => m.set(w, (m.get(w) || 0) + 1), new Map<string, number>())
  const ca = count(a), cb = count(b)
  const only = (x: Map<string, number>, y: Map<string, number>) =>
    [...x].flatMap(([w, n]) => { const d = n - (y.get(w) || 0); return d > 0 ? [d > 1 ? `${w} ×${d}` : w] : [] })
  return { onlyA: only(ca, cb), onlyB: only(cb, ca) }
}

async function capture(browser: Browser, html: string, outDir: string, prefix: string, v2: boolean) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1123, height: 794, deviceScaleFactor: 1.5 })
  await page.setContent(html, { waitUntil: 'load' })
  await page.evaluateHandle('document.fonts.ready')
  if (v2) await page.waitForFunction(() => document.body.dataset.fit === 'done', { timeout: 15000 })
  const pages = await page.$$('.page')
  for (let i = 0; i < pages.length; i++) {
    await pages[i].screenshot({ path: path.join(outDir, `${prefix}-p${String(i + 1).padStart(2, '0')}.png`) })
  }
  const texts: string[] = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.page')).map(p => {
      const c = p.cloneNode(true) as HTMLElement
      c.querySelectorAll('.hdr, .footer, .teaser-overlay, style, script').forEach(e => e.remove())
      // Une los nodos de texto con espacio: en v2 los elementos van pegados sin espacios entre etiquetas.
      const parts: string[] = []
      const walker = document.createTreeWalker(c, NodeFilter.SHOW_TEXT)
      while (walker.nextNode()) parts.push(walker.currentNode.nodeValue || '')
      return parts.join(' ').replace(/\s+/g, ' ')
    }))
  const pdf = await page.pdf({ format: 'A4', landscape: true, printBackground: true, preferCSSPageSize: true })
  fs.writeFileSync(path.join(outDir, `${prefix}.pdf`), pdf)
  await page.close()
  return { count: pages.length, texts }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

async function main() {
  const executablePath = CANDIDATES.find(p => fs.existsSync(p))
  if (!executablePath) throw new Error('No se encontró Chrome/Edge. Define CHROME_PATH.')
  const browser = await puppeteer.launch({ executablePath, headless: true })
  try {
    for (const fx of fixtures) {
      const outDir = path.join(__dirname, '..', 'preview-out', `compare-${fx}`)
      fs.mkdirSync(outDir, { recursive: true })
      for (const f of fs.readdirSync(outDir)) fs.rmSync(path.join(outDir, f), { force: true })
      const data = buildReportData(fixtureProject(fx), FIXTURES[fx], FIXTURE_DATE_INFO, 3, false)
      const v1 = await capture(browser, renderV1(data), outDir, 'v1', false)
      const ed = await capture(browser, renderReportHtmlV2('editorial', data, FIXTURES[fx], loadReportLogos()), outDir, 'editorial', true)

      const n = Math.max(v1.count, ed.count)
      let rows = ''
      let pagesWithDiff = 0
      for (let i = 0; i < n; i++) {
        const p = String(i + 1).padStart(2, '0')
        const d = diff(words(v1.texts[i] || ''), words(ed.texts[i] || ''))
        const same = d.onlyA.length === 0 && d.onlyB.length === 0
        if (!same) pagesWithDiff++
        rows += `<section id="p${i + 1}"><h2>Página ${i + 1}</h2><div class="pair">` +
          `<figure><figcaption>v1 (actual)</figcaption><img src="v1-p${p}.png" loading="lazy"></figure>` +
          `<figure><figcaption>Editorial</figcaption><img src="editorial-p${p}.png" loading="lazy"></figure></div>` +
          `<div class="diff ${same ? 'ok' : 'warn'}">${same ? 'Mismo texto en ambas versiones (sin contar encabezado, pie e íconos).' :
            `<div><b>Solo en v1:</b> ${d.onlyA.length ? esc(d.onlyA.join(' · ')) : '—'}</div><div><b>Solo en Editorial:</b> ${d.onlyB.length ? esc(d.onlyB.join(' · ')) : '—'}</div>`}</div></section>`
      }
      const nav = Array.from({ length: n }, (_, i) => `<a href="#p${i + 1}">${i + 1}</a>`).join('')
      fs.writeFileSync(path.join(outDir, 'index.html'), `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>v1 vs Editorial · ${fx}</title><style>
:root{color-scheme:light dark;--bg:#f4f5f8;--fg:#0e1117;--muted:#5b6577;--card:#fff;--hair:#e4e7ee;--ok:#12a150;--warn:#c77700}
@media (prefers-color-scheme:dark){:root{--bg:#0b0d14;--fg:#eef0f6;--muted:#9aa3b8;--card:#141826;--hair:#262c3d}}
body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.45 system-ui,sans-serif}
header{position:sticky;top:0;z-index:2;background:var(--card);border-bottom:1px solid var(--hair);padding:10px 16px;display:flex;gap:16px;align-items:center;flex-wrap:wrap}
header b{font-size:15px}header span{color:var(--muted)}nav{display:flex;gap:6px;flex-wrap:wrap}
nav a{color:var(--fg);text-decoration:none;border:1px solid var(--hair);border-radius:6px;padding:2px 8px}
main{padding:16px;max-width:2400px;margin:0 auto}section{margin-bottom:28px}h2{font-size:15px;margin:0 0 8px}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}figure{margin:0}figcaption{font-size:12px;color:var(--muted);margin-bottom:4px}
img{width:100%;display:block;border:1px solid var(--hair);border-radius:4px;background:#fff}
.diff{margin-top:8px;padding:8px 12px;border-radius:6px;background:var(--card);border-left:3px solid var(--ok);font-size:13px}
.diff.warn{border-left-color:var(--warn)}.diff div+div{margin-top:4px}
@media (max-width:900px){.pair{grid-template-columns:1fr}}
</style></head><body><header><b>v1 vs Editorial · datos: ${fx}</b><span>${v1.count} / ${ed.count} páginas · ${pagesWithDiff} con diferencias de texto</span><nav>${nav}</nav></header><main>${rows}</main></body></html>`)
      console.log(`${fx}: ${outDir}${path.sep}index.html · páginas v1=${v1.count} editorial=${ed.count} · ${pagesWithDiff} con diferencias de texto`)
    }
  } finally {
    await browser.close()
  }
}

main().catch(e => { console.error(e); process.exit(1) })
