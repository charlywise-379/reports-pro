import { describe, it, expect, vi } from 'vitest'
import { createResendConfirmation, RESEND_MIN_INTERVAL_MS, ResendConfirmationDeps } from './resendConfirmation'

const makeDeps = (over: Partial<ResendConfirmationDeps> = {}) => {
  const clock = { t: 1_000_000 }
  const deps: ResendConfirmationDeps = {
    findAuthUser: vi.fn(async () => ({ confirmed: false, fullName: 'Ana Pérez' })),
    generateLink: vi.fn(async () => 'https://link'),
    sendEmail: vi.fn(async () => undefined),
    now: () => clock.t,
    ...over,
  }
  return { deps, clock }
}

describe('resendConfirmation', () => {
  it('400 si el correo falta o no es texto', async () => {
    const { deps } = makeDeps()
    const resend = createResendConfirmation(deps)
    expect((await resend(undefined)).status).toBe(400)
    expect((await resend('   ')).status).toBe(400)
    expect(deps.findAuthUser).not.toHaveBeenCalled()
  })

  it('200 sin enviar si la cuenta no existe', async () => {
    const { deps } = makeDeps({ findAuthUser: vi.fn(async () => null) })
    expect(await createResendConfirmation(deps)('x@y.com')).toEqual({ status: 200, sent: false })
    expect(deps.sendEmail).not.toHaveBeenCalled()
  })

  it('200 sin enviar si la cuenta ya está confirmada', async () => {
    const { deps } = makeDeps({ findAuthUser: vi.fn(async () => ({ confirmed: true, fullName: null })) })
    expect(await createResendConfirmation(deps)('x@y.com')).toEqual({ status: 200, sent: false })
    expect(deps.generateLink).not.toHaveBeenCalled()
  })

  it('envía a cuenta sin confirmar, con el correo normalizado', async () => {
    const { deps } = makeDeps()
    expect(await createResendConfirmation(deps)('  X@Y.com ')).toEqual({ status: 200, sent: true })
    expect(deps.findAuthUser).toHaveBeenCalledWith('x@y.com')
    expect(deps.sendEmail).toHaveBeenCalledWith('x@y.com', 'Ana Pérez', 'https://link')
  })

  it('limita la frecuencia por correo y vuelve a permitir pasado el intervalo', async () => {
    const { deps, clock } = makeDeps()
    const resend = createResendConfirmation(deps)
    expect((await resend('x@y.com')).sent).toBe(true)
    clock.t += RESEND_MIN_INTERVAL_MS - 1
    expect((await resend('x@y.com')).sent).toBe(false)
    expect((await resend('otro@y.com')).sent).toBe(true)
    clock.t += 1
    expect((await resend('x@y.com')).sent).toBe(true)
    expect(deps.sendEmail).toHaveBeenCalledTimes(3)
  })

  it('no envía ni marca el límite si no se pudo generar el link', async () => {
    const { deps } = makeDeps({ generateLink: vi.fn(async () => null) })
    const resend = createResendConfirmation(deps)
    expect((await resend('x@y.com')).sent).toBe(false)
    expect(deps.sendEmail).not.toHaveBeenCalled()
  })
})
