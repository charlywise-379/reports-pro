import { describe, it, expect, vi } from 'vitest'
import { confirmUserEmail, ConfirmEmailDeps } from './adminConfirmEmail'

const makeDeps = (over: Partial<ConfirmEmailDeps> = {}): ConfirmEmailDeps => ({
  findUser: vi.fn(async (id: string) => ({ id, email: 'a@b.com' })),
  confirmAuthEmail: vi.fn(async () => ({ error: null })),
  audit: vi.fn(async () => undefined),
  ...over,
})

describe('confirmUserEmail', () => {
  it('404 si el usuario no existe', async () => {
    const deps = makeDeps({ findUser: vi.fn(async () => null) })
    expect((await confirmUserEmail(deps, 'u1')).status).toBe(404)
    expect(deps.confirmAuthEmail).not.toHaveBeenCalled()
  })

  it('500 si Supabase falla y no audita', async () => {
    const deps = makeDeps({ confirmAuthEmail: vi.fn(async () => ({ error: new Error('x') })) })
    expect((await confirmUserEmail(deps, 'u1')).status).toBe(500)
    expect(deps.audit).not.toHaveBeenCalled()
  })

  it('200: confirma en Supabase y audita', async () => {
    const deps = makeDeps()
    expect(await confirmUserEmail(deps, 'u1')).toEqual({ status: 200, body: { ok: true } })
    expect(deps.confirmAuthEmail).toHaveBeenCalledWith('u1')
    expect(deps.audit).toHaveBeenCalledWith('admin_confirm_email', { targetUserId: 'u1', email: 'a@b.com' })
  })
})
