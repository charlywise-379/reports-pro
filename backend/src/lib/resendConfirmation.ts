export const RESEND_MIN_INTERVAL_MS = 60_000

export interface ResendConfirmationDeps {
  findAuthUser: (email: string) => Promise<{ confirmed: boolean; fullName: string | null } | null>
  generateLink: (email: string) => Promise<string | null>
  sendEmail: (to: string, fullName: string, confirmUrl: string) => Promise<void>
  now?: () => number
}

// Siempre responde igual exista o no la cuenta (no revela qué correos están registrados);
// `sent` solo sirve para logs y tests. El límite de frecuencia vive en memoria por instancia.
export function createResendConfirmation(deps: ResendConfirmationDeps) {
  const lastSent = new Map<string, number>()
  const now = deps.now ?? Date.now

  return async function resendConfirmation(rawEmail: unknown): Promise<{ status: 200 | 400; sent: boolean }> {
    if (typeof rawEmail !== 'string' || !rawEmail.trim()) return { status: 400, sent: false }
    const email = rawEmail.trim().toLowerCase()

    const user = await deps.findAuthUser(email)
    if (!user || user.confirmed) return { status: 200, sent: false }

    const last = lastSent.get(email)
    if (last !== undefined && now() - last < RESEND_MIN_INTERVAL_MS) return { status: 200, sent: false }

    const link = await deps.generateLink(email)
    if (!link) return { status: 200, sent: false }

    await deps.sendEmail(email, user.fullName || email, link)
    lastSent.set(email, now())
    return { status: 200, sent: true }
  }
}
