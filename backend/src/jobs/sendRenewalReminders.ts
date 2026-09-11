import { prisma } from '../lib/prisma'
import { stripe } from '../lib/stripe'
import { getBillingInterval } from '../lib/stripePriceMap'
import { sendRenewalReminderEmail } from '../lib/email'

export const RENEWAL_REMINDER_LEAD_HOURS = 72

type Frequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'

export type ReminderCandidate = {
  id: string
  status: string
  stripeSubscriptionId: string | null
  stripeCurrentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
  renewalReminderPeriodEnd: Date | null
  accountType: 'STANDARD' | 'PARTNER'
  frequency: Frequency
  stripePriceId: string | null
  userEmail: string
  userFullName: string | null
}

export function selectSubscriptionsToRemind(
  subs: ReminderCandidate[],
  now: Date,
  leadHours: number,
): ReminderCandidate[] {
  const horizon = new Date(now.getTime() + leadHours * 3600_000)
  return subs.filter(s => {
    if (s.status !== 'ACTIVE') return false
    if (!s.stripeSubscriptionId) return false
    if (s.accountType === 'PARTNER') return false
    if (s.cancelAtPeriodEnd) return false
    const pe = s.stripeCurrentPeriodEnd
    if (!pe) return false
    if (!(pe.getTime() > now.getTime() && pe.getTime() <= horizon.getTime())) return false
    if (s.renewalReminderPeriodEnd && s.renewalReminderPeriodEnd.getTime() === pe.getTime()) return false
    return true
  })
}

const LABEL: Record<Frequency, string> = {
  DAILY: 'Diario', WEEKLY: 'Semanal', BIWEEKLY: 'Quincenal', MONTHLY: 'Mensual',
}
export function renewalPlanLabel(frequency: Frequency, interval: 'month' | 'year'): string {
  const base = LABEL[frequency]
  return interval === 'year' ? `${base} (facturación anual)` : base
}

export function formatRenewalDate(d: Date): string {
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
}

export async function sendRenewalReminders(): Promise<void> {
  try {
    const now = new Date()

    // Pre-pass: backfill de periodEnd/cancelAtPeriodEnd desde Stripe cuando falten.
    const missing = await (prisma.subscription as any).findMany({
      where: { status: 'ACTIVE', stripeSubscriptionId: { not: null }, stripeCurrentPeriodEnd: null },
      select: { id: true, stripeSubscriptionId: true },
    })
    for (const m of missing) {
      try {
        const s = await stripe.subscriptions.retrieve(m.stripeSubscriptionId)
        await (prisma.subscription as any).update({
          where: { id: m.id },
          data: {
            stripeCurrentPeriodEnd: (s as any).current_period_end ? new Date((s as any).current_period_end * 1000) : null,
            cancelAtPeriodEnd: s.cancel_at_period_end ?? false,
          },
        })
      } catch (e: any) {
        console.error(`[RenewalReminder] backfill falló para ${m.id}:`, e?.message || e)
      }
    }

    const rows = await (prisma.subscription as any).findMany({
      where: {
        status: 'ACTIVE',
        stripeSubscriptionId: { not: null },
        cancelAtPeriodEnd: false,
        stripeCurrentPeriodEnd: {
          gt: now,
          lte: new Date(now.getTime() + RENEWAL_REMINDER_LEAD_HOURS * 3600_000),
        },
      },
      include: { user: { select: { email: true, fullName: true, accountType: true } } },
    })

    const candidates: ReminderCandidate[] = rows.map((r: any) => ({
      id: r.id,
      status: r.status,
      stripeSubscriptionId: r.stripeSubscriptionId,
      stripeCurrentPeriodEnd: r.stripeCurrentPeriodEnd,
      cancelAtPeriodEnd: r.cancelAtPeriodEnd,
      renewalReminderPeriodEnd: r.renewalReminderPeriodEnd,
      accountType: r.user?.accountType === 'PARTNER' ? 'PARTNER' : 'STANDARD',
      frequency: r.frequency,
      stripePriceId: r.stripePriceId ?? null,
      userEmail: r.user?.email ?? '',
      userFullName: r.user?.fullName ?? null,
    }))

    const toSend = selectSubscriptionsToRemind(candidates, now, RENEWAL_REMINDER_LEAD_HOURS)
    console.log(`[RenewalReminder] ${candidates.length} candidatas, ${toSend.length} a enviar`)

    const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://reports-pro.vercel.app').split(',')[0].trim()

    for (const c of toSend) {
      if (!c.userEmail) continue
      try {
        const label = renewalPlanLabel(c.frequency, getBillingInterval(c.stripePriceId))
        await sendRenewalReminderEmail(
          c.userEmail,
          c.userFullName,
          label,
          formatRenewalDate(c.stripeCurrentPeriodEnd as Date),
          `${FRONTEND_URL}/dashboard`,
        )
        await (prisma.subscription as any).update({
          where: { id: c.id },
          data: { renewalReminderSentAt: new Date(), renewalReminderPeriodEnd: c.stripeCurrentPeriodEnd },
        })
        console.log(`[RenewalReminder] enviado a ${c.userEmail} (sub ${c.id})`)
      } catch (e: any) {
        console.error(`[RenewalReminder] fallo con sub ${c.id}:`, e?.message || e)
      }
    }
  } catch (e: any) {
    console.error('[RenewalReminder] error:', e?.message || e)
  }
}
