import { describe, it, expect } from 'vitest'
import { stripCitationTags } from './stripCitations'

describe('stripCitationTags', () => {
  it('quita <cite> y deja el texto', () => {
    expect(stripCitationTags('El mercado <cite index="3-1,3-2">creció 12%</cite> en 2026.')).toBe('El mercado creció 12% en 2026.')
  })

  it('recorre objetos y arreglos anidados sin tocar otros tipos', () => {
    const input = { a: '<cite index="1">x</cite>', b: [{ c: 'y <CITE>z</CITE>' }, 3, null], d: true }
    expect(stripCitationTags(input)).toEqual({ a: 'x', b: [{ c: 'y z' }, 3, null], d: true })
  })

  it('no altera texto sin marcas ni otros símbolos < >', () => {
    expect(stripCitationTags('Precio < $50 y margen > 20%')).toBe('Precio < $50 y margen > 20%')
    expect(stripCitationTags('  sin cambios  ')).toBe('  sin cambios  ')
  })
})
