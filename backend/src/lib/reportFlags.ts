// Lógica pura de elegibilidad y flags de reporte, compartida por el worker
// (`reportWorker.ts`) y el endpoint de generación (`routes/reports.ts`).

export const PARTNER_REPORT_MIN_HOURS = 720 // 30 días — 1 reporte/mes por proyecto partner

// 0 = puede generar; >0 = horas que faltan.
export function partnerReportBlockedHours(lastCompletedAt: Date | null, now: Date): number {
  if (!lastCompletedAt) return 0
  const elapsedH = (now.getTime() - lastCompletedAt.getTime()) / 3600_000
  if (elapsedH >= PARTNER_REPORT_MIN_HOURS) return 0
  return Math.ceil(PARTNER_REPORT_MIN_HOURS - elapsedH)
}

export function computeReportEligibility(p: {
  accountType: 'STANDARD' | 'PARTNER'
  trialVigente: boolean
  tieneStripe: boolean
  eligibleViaFullAccessPromo: boolean
}): boolean {
  if (p.accountType === 'PARTNER') return true
  return p.trialVigente || p.tieneStripe || p.eligibleViaFullAccessPromo
}

export function computeReportFlags(p: {
  accountType: 'STANDARD' | 'PARTNER'
  hasPaid: boolean
  freeReportUsedAt: Date | null
  hasPromoAccess: boolean
}): { isFreeReport: boolean; isTeaser: boolean } {
  if (p.accountType === 'PARTNER') return { isFreeReport: false, isTeaser: false }
  const isFreeReport = !p.hasPaid && !p.freeReportUsedAt
  const isTeaser = isFreeReport && !p.hasPromoAccess
  return { isFreeReport, isTeaser }
}
