// Dueño canónico del tipo — lifecycleQueue.ts y lifecycleWorker.ts lo importan de aquí.
export type LifecycleReason = 'registered' | 'trial' | 'paid' | 'cancelled'

type Frequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'

const PLAN_TAG: Record<Frequency, string> = {
  DAILY: 'plan-diario',
  WEEKLY: 'plan-semanal',
  BIWEEKLY: 'plan-quincenal',
  MONTHLY: 'plan-mensual',
}

export function planTagForFrequency(freq: Frequency): string {
  return PLAN_TAG[freq]
}

export function splitName(fullName: string | null | undefined): { firstName?: string; lastName?: string } {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return {}
  if (parts.length === 1) return { firstName: parts[0] }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

export function tagsForReason(
  reason: LifecycleReason,
  ctx: { frequency?: Frequency | null },
): string[] {
  switch (reason) {
    case 'registered': return ['estado-registrado']
    case 'trial': return ['estado-trial']
    case 'cancelled': return ['estado-cancelado']
    case 'paid': return ctx.frequency ? ['estado-activo', planTagForFrequency(ctx.frequency)] : ['estado-activo']
  }
}

export function shouldEnqueueTrialSync(u: {
  accountType: string
  mailchimpSyncedAt: Date | null
  mailchimpTrialTaggedAt: Date | null
}): boolean {
  return u.accountType === 'STANDARD' && u.mailchimpSyncedAt != null && u.mailchimpTrialTaggedAt == null
}
