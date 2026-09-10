import { describe, it, expect } from 'vitest'
import {
  resolvePartnerCode,
  isPartnerDomain,
  evaluatePartnerRegistration,
  PARTNER_DOMAINS,
  PARTNER_CODES,
} from './partners'

const DOMAIN_ERROR =
  'Este código es exclusivo para correos de empresas asociadas (@bvro.mx, @flow11.mx, @omnireports.pro).'

describe('resolvePartnerCode', () => {
  it('mapea BVROMKT2026 a BVRO y FLOW11MX a FLOW11', () => {
    expect(resolvePartnerCode('BVROMKT2026')).toBe('BVRO')
    expect(resolvePartnerCode('FLOW11MX')).toBe('FLOW11')
  })
  it('devuelve undefined para un código desconocido', () => {
    expect(resolvePartnerCode('PROMO2026')).toBeUndefined()
    expect(resolvePartnerCode('')).toBeUndefined()
  })
})

describe('isPartnerDomain', () => {
  it('true para los tres dominios asociados', () => {
    expect(isPartnerDomain('ana@bvro.mx')).toBe(true)
    expect(isPartnerDomain('luis@flow11.mx')).toBe(true)
    expect(isPartnerDomain('sam@omnireports.pro')).toBe(true)
  })
  it('false para dominios externos o email malformado', () => {
    expect(isPartnerDomain('ana@gmail.com')).toBe(false)
    expect(isPartnerDomain('sin-arroba')).toBe(false)
    expect(isPartnerDomain('a@sub.bvro.mx')).toBe(false)
  })
})

describe('evaluatePartnerRegistration', () => {
  it('código no partner → no partner, sin error', () => {
    expect(evaluatePartnerRegistration('PROMO2026', 'x@gmail.com')).toEqual({
      isPartner: false, agency: null, code: null, error: null,
    })
    expect(evaluatePartnerRegistration('', 'x@bvro.mx')).toEqual({
      isPartner: false, agency: null, code: null, error: null,
    })
    expect(evaluatePartnerRegistration(null, 'x@bvro.mx')).toEqual({
      isPartner: false, agency: null, code: null, error: null,
    })
  })
  it('normaliza mayúsculas/espacios del código y del email', () => {
    expect(evaluatePartnerRegistration('  bvromkt2026 ', ' ANA@BVRO.MX ')).toEqual({
      isPartner: true, agency: 'BVRO', code: 'BVROMKT2026', error: null,
    })
  })
  it('código partner + dominio partner → partner', () => {
    expect(evaluatePartnerRegistration('FLOW11MX', 'luis@omnireports.pro')).toEqual({
      isPartner: true, agency: 'FLOW11', code: 'FLOW11MX', error: null,
    })
  })
  it('código partner + dominio externo → rechazo con error', () => {
    expect(evaluatePartnerRegistration('BVROMKT2026', 'ana@gmail.com')).toEqual({
      isPartner: false, agency: null, code: null, error: DOMAIN_ERROR,
    })
  })
})

describe('constantes', () => {
  it('exponen los valores esperados', () => {
    expect([...PARTNER_DOMAINS].sort()).toEqual(['bvro.mx', 'flow11.mx', 'omnireports.pro'])
    expect(PARTNER_CODES).toEqual({ BVROMKT2026: 'BVRO', FLOW11MX: 'FLOW11' })
  })
})
