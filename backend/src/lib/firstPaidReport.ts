// Primer reporte completo automático en cuanto Stripe confirma el pago.
// Se llama desde el webhook (checkout.session.completed) y desde verify-session (lo que llegue primero).
// El jobId fijo hace que BullMQ ignore el segundo intento mientras el job exista.

export interface FirstPaidReportDeps {
  isConfigured: (projectId: string) => Promise<boolean>
  hasFullReport: (projectId: string) => Promise<boolean>
  hasGeneratingReport: (projectId: string) => Promise<boolean>
  hasPendingJob: (projectId: string) => Promise<boolean>
  enqueue: (projectId: string, userId: string, jobId: string) => Promise<unknown>
}

export type FirstPaidReportResult =
  | { queued: true }
  | { queued: false; reason: 'not_paid' | 'not_configured' | 'already_has_full_report' | 'already_generating' }

export const firstPaidReportJobId = (projectId: string) => `first-paid-${projectId}`

export async function enqueueFirstPaidReport(
  deps: FirstPaidReportDeps,
  input: { projectId: string; userId: string; subscriptionStatus: string },
): Promise<FirstPaidReportResult> {
  const { projectId, userId } = input
  if (input.subscriptionStatus !== 'active') return { queued: false, reason: 'not_paid' }
  if (!(await deps.isConfigured(projectId))) return { queued: false, reason: 'not_configured' }
  if (await deps.hasFullReport(projectId)) return { queued: false, reason: 'already_has_full_report' }
  if ((await deps.hasGeneratingReport(projectId)) || (await deps.hasPendingJob(projectId))) {
    return { queued: false, reason: 'already_generating' }
  }
  await deps.enqueue(projectId, userId, firstPaidReportJobId(projectId))
  return { queued: true }
}
