import { z } from 'zod'

export const setPasswordSchema = z.object({
  password: z.string().min(8).max(72),
})

export interface SetPasswordDeps {
  findUser: (id: string) => Promise<{ id: string; email: string } | null>
  updateAuthPassword: (id: string, password: string) => Promise<{ error: unknown }>
  audit: (event: string, metadata: Record<string, unknown>) => Promise<unknown>
}

export type SetPasswordResult =
  | { status: 200; body: { ok: true } }
  | { status: 400 | 404 | 500; body: { error: string } }

export async function setUserPassword(
  deps: SetPasswordDeps,
  id: string,
  input: unknown,
): Promise<SetPasswordResult> {
  const parsed = setPasswordSchema.safeParse(input)
  if (!parsed.success) {
    return { status: 400, body: { error: 'La contraseña debe tener entre 8 y 72 caracteres' } }
  }

  const user = await deps.findUser(id)
  if (!user) return { status: 404, body: { error: 'Usuario no encontrado' } }

  const { error } = await deps.updateAuthPassword(id, parsed.data.password)
  if (error) return { status: 500, body: { error: 'No se pudo actualizar la contraseña' } }

  await deps.audit('admin_set_password', { targetUserId: id, email: user.email })
  return { status: 200, body: { ok: true } }
}
