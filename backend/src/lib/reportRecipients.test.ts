import { describe, it, expect } from 'vitest'
import { reportEmailRecipients, ccEmailsFromSetup } from './reportRecipients'

describe('reportEmailRecipients', () => {
  it('siempre incluye el correo de la cuenta y agrega el de entrega', () => {
    expect(reportEmailRecipients({ accountEmail: 'almex@bvro.mx', deliveryEmail: 'desarrollo@flow11.mx' }))
      .toEqual({ to: ['almex@bvro.mx', 'desarrollo@flow11.mx'], cc: [] })
  })

  it('sin correo de entrega: solo la cuenta', () => {
    expect(reportEmailRecipients({ accountEmail: 'a@b.com', deliveryEmail: null }).to).toEqual(['a@b.com'])
    expect(reportEmailRecipients({ accountEmail: 'a@b.com', deliveryEmail: '  ' }).to).toEqual(['a@b.com'])
  })

  it('no duplica si el correo de entrega es el de la cuenta (sin importar mayúsculas)', () => {
    expect(reportEmailRecipients({ accountEmail: 'a@b.com', deliveryEmail: ' A@B.com ' }).to).toEqual(['a@b.com'])
  })

  it('colegas en copia, sin repetir a los destinatarios principales', () => {
    expect(reportEmailRecipients({ accountEmail: 'a@b.com', deliveryEmail: 'c@d.com', ccEmails: ['x@y.com', 'C@d.com', 'x@y.com', '', 3] }))
      .toEqual({ to: ['a@b.com', 'c@d.com'], cc: ['x@y.com'] })
  })

  it('ignora correos inválidos', () => {
    expect(reportEmailRecipients({ accountEmail: 'a@b.com', deliveryEmail: 'user-1' }).to).toEqual(['a@b.com'])
  })
})

describe('ccEmailsFromSetup', () => {
  it('lee ccEmails de additionalContext como string o como objeto', () => {
    expect(ccEmailsFromSetup({ additionalContext: '{"ccEmails":["x@y.com"]}' })).toEqual(['x@y.com'])
    expect(ccEmailsFromSetup({ additionalContext: { ccEmails: ['x@y.com'] } })).toEqual(['x@y.com'])
  })
  it('devuelve [] si no hay o el JSON es inválido', () => {
    expect(ccEmailsFromSetup(null)).toEqual([])
    expect(ccEmailsFromSetup({ additionalContext: '{malo' })).toEqual([])
  })
})
