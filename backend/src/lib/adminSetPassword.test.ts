import { describe, it, expect, vi } from 'vitest'
import { setUserPassword, SetPasswordDeps } from './adminSetPassword'

const makeDeps = (over: Partial<SetPasswordDeps> = {}): SetPasswordDeps => ({
  findUser: vi.fn(async (id: string) => ({ id, email: 'a@b.com' })),
  updateAuthPassword: vi.fn(async () => ({ error: null })),
  audit: vi.fn(async () => undefined),
  ...over,
})

describe('setUserPassword', () => {
  it('400 si la contraseña es corta o falta', async () => {
    const deps = makeDeps()
    expect((await setUserPassword(deps, 'u1', { password: '1234567' })).status).toBe(400)
    expect((await setUserPassword(deps, 'u1', {})).status).toBe(400)
    expect((await setUserPassword(deps, 'u1', { password: 'x'.repeat(73) })).status).toBe(400)
    expect(deps.updateAuthPassword).not.toHaveBeenCalled()
  })

  it('404 si el usuario no existe', async () => {
    const deps = makeDeps({ findUser: vi.fn(async () => null) })
    expect((await setUserPassword(deps, 'u1', { password: 'password123' })).status).toBe(404)
    expect(deps.updateAuthPassword).not.toHaveBeenCalled()
  })

  it('500 si Supabase falla y no audita', async () => {
    const deps = makeDeps({ updateAuthPassword: vi.fn(async () => ({ error: new Error('x') })) })
    expect((await setUserPassword(deps, 'u1', { password: 'password123' })).status).toBe(500)
    expect(deps.audit).not.toHaveBeenCalled()
  })

  it('200: actualiza en Supabase y audita sin guardar la contraseña', async () => {
    const deps = makeDeps()
    const r = await setUserPassword(deps, 'u1', { password: 'password123' })
    expect(r).toEqual({ status: 200, body: { ok: true } })
    expect(deps.updateAuthPassword).toHaveBeenCalledWith('u1', 'password123')
    expect(deps.audit).toHaveBeenCalledWith('admin_set_password', { targetUserId: 'u1', email: 'a@b.com' })
    expect(JSON.stringify((deps.audit as any).mock.calls)).not.toContain('password123')
  })
})
