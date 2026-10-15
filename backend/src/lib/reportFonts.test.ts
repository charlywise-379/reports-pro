import { describe, it, expect } from 'vitest'
import { FONT_FILES, reportFontFaces } from './reportFonts'

describe('reportFontFaces', () => {
  const css = reportFontFaces()
  it('genera un @font-face por archivo con datos en base64', () => {
    expect((css.match(/@font-face/g) || []).length).toBe(FONT_FILES.length)
    expect((css.match(/data:font\/woff2;base64,/g) || []).length).toBe(FONT_FILES.length)
  })
  it('declara las dos familias y los pesos usados', () => {
    expect(css).toContain("font-family:'Geist'")
    expect(css).toContain("font-family:'Geist Mono'")
    for (const w of [400, 500, 600]) expect(css).toContain(`font-weight:${w}`)
  })
  it('no contiene marcadores de plantilla', () => {
    expect(css).not.toContain('{{')
  })
  it('devuelve lo mismo en llamadas repetidas (caché)', () => {
    expect(reportFontFaces()).toBe(css)
  })
})
