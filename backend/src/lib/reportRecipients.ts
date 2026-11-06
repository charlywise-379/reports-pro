// Destinatarios del correo de un reporte:
// - siempre el correo de la cuenta del usuario;
// - además el correo capturado en la entrega del reporte (si el usuario escribió uno);
// - los colegas invitados van en copia.
// Sin duplicados (sin distinguir mayúsculas) y sin direcciones vacías.

const norm = (e: unknown) => (typeof e === 'string' ? e.trim() : '')

export function reportEmailRecipients(input: {
  accountEmail?: string | null
  deliveryEmail?: string | null
  ccEmails?: unknown
}): { to: string[]; cc: string[] } {
  const seen = new Set<string>()
  const add = (list: string[], e: unknown) => {
    const v = norm(e)
    if (!v || !v.includes('@') || seen.has(v.toLowerCase())) return
    seen.add(v.toLowerCase())
    list.push(v)
  }
  const to: string[] = []
  const cc: string[] = []
  add(to, input.accountEmail)
  add(to, input.deliveryEmail)
  for (const e of Array.isArray(input.ccEmails) ? input.ccEmails : []) add(cc, e)
  return { to, cc }
}

export function ccEmailsFromSetup(setup: { additionalContext?: unknown } | null | undefined): string[] {
  try {
    const raw = setup?.additionalContext
    const ctx = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {}
    return Array.isArray(ctx?.ccEmails) ? ctx.ccEmails : []
  } catch {
    return []
  }
}
