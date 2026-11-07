import { describe, it, expect } from 'vitest'
import { registeredDirectCompetitors } from './promptContext'
import { buildCompetitivePromptV2 } from './competitivePromptV2'
import { FIXTURE_DATE_INFO } from '../reportFixtures'

// Forma exacta en que routes/onboarding.ts guarda el setup: additionalContext (JSON string) + columnas competitorN.
const onboardingSetup = {
  companyName: 'Almex',
  industry: 'Transporte de carga',
  additionalContext: JSON.stringify({
    directCompetitors: [
      { name: 'Transportes Castores', url: 'https://castores.com.mx', products: 'LTL', presence: 'Nacional', threat: 8 },
      { name: 'Transportes Tresguerras', url: 'https://tresguerras.com.mx', products: 'LTL y paquetería' },
    ],
  }),
  competitor1Name: 'Transportes Castores', competitor1Website: 'https://castores.com.mx',
  competitor2Name: 'Transportes Tresguerras', competitor2Website: 'https://tresguerras.com.mx',
}

describe('registeredDirectCompetitors (solo lectura del setup)', () => {
  it('lee el formato del onboarding sin duplicar las columnas competitorN', () => {
    expect(registeredDirectCompetitors(onboardingSetup)).toEqual([
      { name: 'Transportes Castores', url: 'https://castores.com.mx', products: 'LTL' },
      { name: 'Transportes Tresguerras', url: 'https://tresguerras.com.mx', products: 'LTL y paquetería' },
    ])
  })

  it('setups antiguos solo con columnas y fixtures con setup.directCompetitors', () => {
    expect(registeredDirectCompetitors({ competitor1Name: 'A', competitor3Name: 'C' }).map(c => c.name)).toEqual(['A', 'C'])
    expect(registeredDirectCompetitors({ directCompetitors: [{ name: 'Sticker Mule' }, { name: '' }] }).map(c => c.name)).toEqual(['Sticker Mule'])
    expect(registeredDirectCompetitors({ additionalContext: '{roto' , competitor1Name: 'A' }).map(c => c.name)).toEqual(['A'])
    expect(registeredDirectCompetitors(undefined)).toEqual([])
  })

  it('no modifica el setup y el prompt v2 lista los competidores registrados', () => {
    const before = JSON.stringify(onboardingSetup)
    const prompt = buildCompetitivePromptV2({ name: 'Almex', setup: onboardingSetup }, FIXTURE_DATE_INFO)
    expect(JSON.stringify(onboardingSetup)).toBe(before)
    expect(prompt).toContain('- Transportes Castores | URL: https://castores.com.mx | Servicios: LTL')
    expect(prompt).toContain('- Transportes Tresguerras')
  })
})
