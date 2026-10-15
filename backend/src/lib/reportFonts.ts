// CSS @font-face con Geist y Geist Mono incrustados en base64, para que el PDF salga igual
// aunque el navegador de Browserless no tenga acceso a internet.
import fs from 'fs'
import path from 'path'

export const FONT_FILES = [
  { family: 'Geist', weight: 400, file: 'geist-latin-400-normal.woff2' },
  { family: 'Geist', weight: 500, file: 'geist-latin-500-normal.woff2' },
  { family: 'Geist', weight: 600, file: 'geist-latin-600-normal.woff2' },
  { family: 'Geist Mono', weight: 400, file: 'geist-mono-latin-400-normal.woff2' },
  { family: 'Geist Mono', weight: 500, file: 'geist-mono-latin-500-normal.woff2' },
]

const DEFAULT_DIR = path.join(__dirname, '../templates/v2/fonts')
const cache = new Map<string, string>()

export function reportFontFaces(dir: string = DEFAULT_DIR): string {
  const hit = cache.get(dir)
  if (hit) return hit
  const css = FONT_FILES.map(f => {
    const b64 = fs.readFileSync(path.join(dir, f.file)).toString('base64')
    return `@font-face{font-family:'${f.family}';font-weight:${f.weight};font-style:normal;font-display:block;src:url(data:font/woff2;base64,${b64}) format('woff2')}`
  }).join('\n')
  cache.set(dir, css)
  return css
}
