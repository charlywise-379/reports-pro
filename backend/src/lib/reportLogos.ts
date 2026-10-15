// Logos de Omni Reports para el PDF v2, incrustados como data URI.
// logo-full.png = wordmark blanco (para fondos oscuros); logo-full-dark.png = wordmark negro (fondos claros).
import fs from 'fs'
import path from 'path'

export interface ReportLogos { onDark: string; onLight: string }

const DEFAULT_DIR = path.join(__dirname, '../assets')
const cache = new Map<string, ReportLogos>()
const dataUri = (file: string): string => 'data:image/png;base64,' + fs.readFileSync(file).toString('base64')

export function loadReportLogos(dir: string = DEFAULT_DIR): ReportLogos {
  const hit = cache.get(dir)
  if (hit) return hit
  const logos = {
    onDark: dataUri(path.join(dir, 'logo-full.png')),
    onLight: dataUri(path.join(dir, 'logo-full-dark.png')),
  }
  cache.set(dir, logos)
  return logos
}
