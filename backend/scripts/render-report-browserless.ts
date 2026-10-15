// Verificación de extremo a extremo: genera el PDF v2 con la misma llamada a Browserless que usa
// `generateReport` en producción, usando únicamente datos de ejemplo (fixture normal).
// Uso: npx tsx scripts/render-report-browserless.ts --skin editorial|panel [--teaser] [--out <carpeta>]
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { buildReportData } from '../src/lib/reportEngine'
import { renderReportHtmlV2 } from '../src/lib/reportTemplates'
import { loadReportLogos } from '../src/lib/reportLogos'
import { FIXTURE_PROJECT, FIXTURE_DATE_INFO, FIXTURES } from '../src/lib/reportFixtures'

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : fallback
}
const skin = arg('skin', 'editorial')
const teaser = process.argv.includes('--teaser')
const outDir = arg('out', 'D:/Trabajo/FLOW11/OmniReports-muestras')

async function main() {
  if (skin !== 'editorial' && skin !== 'panel') throw new Error('--skin debe ser editorial o panel')
  const token = process.env.BLESS_KEY
  if (!token) throw new Error('BLESS_KEY no está configurada')

  const aiData = FIXTURES.normal
  const data = buildReportData(FIXTURE_PROJECT, aiData, FIXTURE_DATE_INFO, 3, teaser)
  const html = renderReportHtmlV2(skin, data, aiData, loadReportLogos())

  const response = await fetch(`https://production-sfo.browserless.io/pdf?token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      html,
      options: { format: 'A4', landscape: true, printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } },
    }),
  })
  console.log(`HTTP ${response.status}`)
  if (!response.ok) {
    const body = (await response.text()).split(token).join('***')
    throw new Error(`Browserless error: ${response.status} ${body.slice(0, 500)}`)
  }
  const pdf = Buffer.from(await response.arrayBuffer())
  fs.mkdirSync(outDir, { recursive: true })
  const file = path.join(outDir, `browserless-${skin}${teaser ? '-gratuito' : ''}.pdf`)
  fs.writeFileSync(file, pdf)
  const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length
  console.log(`${file}: ${pdf.length} bytes, ${pages} páginas`)
}

main().catch(e => {
  const t = process.env.BLESS_KEY
  console.error(t ? String(e?.message ?? e).split(t).join('***') : String(e?.message ?? e))
  process.exit(1)
})
