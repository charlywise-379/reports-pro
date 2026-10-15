import { describe, it, expect } from 'vitest'
import { loadReportLogos } from './reportLogos'

describe('loadReportLogos', () => {
  const logos = loadReportLogos()
  const PNG = [0x89, 0x50, 0x4e, 0x47]
  const bytes = (uri: string) => Buffer.from(uri.split(',')[1], 'base64')

  it('devuelve dos data URI PNG distintos', () => {
    expect(logos.onDark.startsWith('data:image/png;base64,')).toBe(true)
    expect(logos.onLight.startsWith('data:image/png;base64,')).toBe(true)
    expect(logos.onDark).not.toBe(logos.onLight)
  })
  it('cada uno decodifica a un PNG real', () => {
    expect([...bytes(logos.onDark).subarray(0, 4)]).toEqual(PNG)
    expect([...bytes(logos.onLight).subarray(0, 4)]).toEqual(PNG)
  })
  it('devuelve el mismo objeto en llamadas repetidas (caché)', () => {
    expect(loadReportLogos()).toBe(logos)
  })
})
