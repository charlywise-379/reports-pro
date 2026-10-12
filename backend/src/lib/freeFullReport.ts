// Un código FULL_ACCESS_NO_TRIAL da derecho a UN primer reporte completo sin pago.
// Mientras no se use (freeReportUsedAt) y no haya pagado, el usuario no debe ver cobro.
export function hasFreeFullReport(p: {
  accountType: string | null | undefined
  promoType: string | null | undefined
  freeReportUsedAt: Date | null | undefined
  hasPaid: boolean
}): boolean {
  if (p.accountType === 'PARTNER') return false
  return p.promoType === 'FULL_ACCESS_NO_TRIAL' && !p.freeReportUsedAt && !p.hasPaid
}
