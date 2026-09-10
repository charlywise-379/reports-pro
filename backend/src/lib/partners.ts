// Constantes de acceso partner (empresas hermanas BVRO / Flow11).
// Son fijas y ligadas a dominio — viven en config, no en la tabla PromoCode.

export const PARTNER_DOMAINS = new Set<string>(['bvro.mx', 'flow11.mx', 'omnireports.pro'])

export const PARTNER_CODES: Record<string, 'BVRO' | 'FLOW11'> = {
  BVROMKT2026: 'BVRO',
  FLOW11MX: 'FLOW11',
}

const DOMAIN_ERROR =
  'Este código es exclusivo para correos de empresas asociadas (@bvro.mx, @flow11.mx, @omnireports.pro).'

// `code` debe venir ya en MAYÚSCULAS y sin espacios.
export function resolvePartnerCode(code: string): 'BVRO' | 'FLOW11' | undefined {
  return PARTNER_CODES[code]
}

// `email` debe venir ya en minúsculas.
export function isPartnerDomain(email: string): boolean {
  const at = email.lastIndexOf('@')
  if (at === -1) return false
  return PARTNER_DOMAINS.has(email.slice(at + 1))
}

export function evaluatePartnerRegistration(
  rawCode: string | null | undefined,
  email: string,
): { isPartner: boolean; agency: 'BVRO' | 'FLOW11' | null; code: string | null; error: string | null } {
  const code = (rawCode ?? '').trim().toUpperCase()
  const normalizedEmail = email.trim().toLowerCase()
  const agency = code ? resolvePartnerCode(code) : undefined

  if (!agency) {
    return { isPartner: false, agency: null, code: null, error: null }
  }
  if (!isPartnerDomain(normalizedEmail)) {
    return { isPartner: false, agency: null, code: null, error: DOMAIN_ERROR }
  }
  return { isPartner: true, agency, code, error: null }
}
