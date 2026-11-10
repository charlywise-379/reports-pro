import { prisma } from '../lib/prisma'
import { getResend } from '../lib/email'
import { buildOnboardingReminderEmail } from '../lib/onboardingReminderEmail'
import { hasConfiguredSetup } from '../lib/scheduleEligibility'

// Recordatorio único a usuarios nuevos que, 24 h después de registrarse, no han terminado el onboarding.
// - Ventana: registrados hace 24 h a 7 días (los registros viejos no reciben correos de golpe).
// - Solo cuentas con correo confirmado y no suspendidas; sin ningún proyecto con la configuración completa.
// - Se envía una sola vez por usuario: queda registrado en AuditLog (event = onboarding_reminder_sent).
// - Solo de 9:00 a 19:59 hora de CDMX, para que llegue en horario amable.

export const ONBOARDING_REMINDER_AFTER_HOURS = 24
export const ONBOARDING_REMINDER_MAX_AGE_DAYS = 7
export const ONBOARDING_REMINDER_EVENT = 'onboarding_reminder_sent'
const SEND_HOURS = { from: 9, to: 19 }

export interface OnboardingCandidate {
  id: string
  email: string
  fullName: string | null
  company: string | null
  createdAt: Date
  isSuspended: boolean
  confirmed: boolean
  hasConfiguredProject: boolean
  alreadyReminded: boolean
  pendingProjectId: string | null
}

export function selectUsersToRemind(users: OnboardingCandidate[], now: Date): OnboardingCandidate[] {
  const newest = now.getTime() - ONBOARDING_REMINDER_AFTER_HOURS * 3600_000
  const oldest = now.getTime() - ONBOARDING_REMINDER_MAX_AGE_DAYS * 24 * 3600_000
  return users.filter(u => {
    const t = u.createdAt.getTime()
    return t <= newest && t >= oldest && !!u.email && !u.isSuspended && u.confirmed && !u.hasConfiguredProject && !u.alreadyReminded
  })
}

export function mexicoCityHour(now: Date): number {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', hour: 'numeric', hourCycle: 'h23' }).format(now))
}

export function isFriendlyHour(now: Date): boolean {
  const h = mexicoCityHour(now)
  return h >= SEND_HOURS.from && h <= SEND_HOURS.to
}

export function onboardingUrlFor(frontendUrl: string, projectId: string | null): string {
  return projectId ? `${frontendUrl}/onboarding?projectId=${encodeURIComponent(projectId)}` : `${frontendUrl}/onboarding`
}

export async function sendOnboardingReminders(now: Date = new Date()): Promise<void> {
  try {
    if (!isFriendlyHour(now)) return
    const newest = new Date(now.getTime() - ONBOARDING_REMINDER_AFTER_HOURS * 3600_000)
    const oldest = new Date(now.getTime() - ONBOARDING_REMINDER_MAX_AGE_DAYS * 24 * 3600_000)

    const users = await (prisma.user as any).findMany({
      where: { createdAt: { gte: oldest, lte: newest }, isSuspended: false },
      select: {
        id: true, email: true, fullName: true, company: true, createdAt: true, isSuspended: true,
        projects: { select: { id: true, createdAt: true, competitiveSetup: { select: { companyName: true } } }, orderBy: { createdAt: 'desc' } },
      },
    })
    if (!users.length) return

    const ids: string[] = users.map((u: any) => u.id)
    const confirmedRows = await prisma.$queryRaw<{ id: string; confirmed: boolean }[]>`select id::text as id, email_confirmed_at is not null as confirmed from auth.users where id::text = any(${ids})`
    const confirmed = new Set(confirmedRows.filter(r => r.confirmed).map(r => r.id))
    const reminded = new Set((await prisma.auditLog.findMany({
      where: { event: ONBOARDING_REMINDER_EVENT, userId: { in: ids } },
      select: { userId: true },
    })).map(r => r.userId))

    const candidates: OnboardingCandidate[] = users.map((u: any) => ({
      id: u.id, email: u.email, fullName: u.fullName ?? null, company: u.company ?? null, createdAt: u.createdAt,
      isSuspended: !!u.isSuspended, confirmed: confirmed.has(u.id),
      hasConfiguredProject: (u.projects || []).some((p: any) => hasConfiguredSetup(p)),
      alreadyReminded: reminded.has(u.id),
      pendingProjectId: u.projects?.[0]?.id ?? null,
    }))
    const toSend = selectUsersToRemind(candidates, now)
    console.log(`[OnboardingReminder] ${candidates.length} registros recientes, ${toSend.length} a enviar`)

    const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://omnireports.pro').split(',')[0].trim().replace(/\/$/, '')
    for (const u of toSend) {
      try {
        const mail = buildOnboardingReminderEmail({ fullName: u.fullName, company: u.company, onboardingUrl: onboardingUrlFor(FRONTEND_URL, u.pendingProjectId) })
        const { error } = await getResend().emails.send({
          from: 'Omni Reports <reportes@flow11.mx>',
          replyTo: 'soporte@omnireports.pro',
          to: u.email,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
        }) as any
        if (error) throw new Error(error.message || JSON.stringify(error))
        await prisma.auditLog.create({ data: { userId: u.id, event: ONBOARDING_REMINDER_EVENT, metadata: { email: u.email, projectId: u.pendingProjectId } } })
        console.log(`[OnboardingReminder] enviado a ${u.email}`)
      } catch (e: any) {
        console.error(`[OnboardingReminder] fallo con ${u.email}:`, e?.message || e)
      }
    }
  } catch (e: any) {
    console.error('[OnboardingReminder] error:', e?.message || e)
  }
}
