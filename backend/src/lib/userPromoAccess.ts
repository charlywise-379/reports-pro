// El acceso de un código promocional cuenta a nivel de USUARIO: si canjeó un código de acceso completo,
// cada una de sus empresas recibe su primer reporte completo sin volver a canjearlo.
export function summarizePromoAccess(redemptions: { type?: string | null }[]): {
  hasPromoAccess: boolean
  hasFullAccessPromo: boolean
} {
  return {
    hasPromoAccess: redemptions.length > 0,
    hasFullAccessPromo: redemptions.some(r => r.type === 'FULL_ACCESS_NO_TRIAL'),
  }
}
