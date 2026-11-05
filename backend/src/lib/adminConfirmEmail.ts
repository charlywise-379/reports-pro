// Activación manual de una cuenta desde el backoffice: marca el correo como confirmado en Supabase Auth
// para que el usuario pueda iniciar sesión sin abrir el enlace de confirmación.

export interface ConfirmEmailDeps {
  findUser: (id: string) => Promise<{ id: string; email: string } | null>
  confirmAuthEmail: (id: string) => Promise<{ error: unknown }>
  audit: (event: string, metadata: Record<string, unknown>) => Promise<unknown>
}

export type ConfirmEmailResult =
  | { status: 200; body: { ok: true } }
  | { status: 404 | 500; body: { error: string } }

export async function confirmUserEmail(deps: ConfirmEmailDeps, id: string): Promise<ConfirmEmailResult> {
  const user = await deps.findUser(id)
  if (!user) return { status: 404, body: { error: 'Usuario no encontrado' } }

  const { error } = await deps.confirmAuthEmail(id)
  if (error) return { status: 500, body: { error: 'No se pudo activar la cuenta' } }

  await deps.audit('admin_confirm_email', { targetUserId: id, email: user.email })
  return { status: 200, body: { ok: true } }
}
