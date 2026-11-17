import { describe, it, expect } from 'vitest'
import { buildMetaEventPayload, sanitizeBrowserContext, sha256, predictedLtv } from './metaCapi'

describe('Meta Conversions API', () => {
  it('arma el evento con email e id en SHA-256 y datos del navegador sin hash', () => {
    const p = buildMetaEventPayload({
      eventName: 'Subscribe', eventId: 'subscribe_in_1', eventTime: 1763300000,
      sourceUrl: 'https://omnireports.pro/checkout/success', email: '  Ana@Empresa.MX ', externalId: 'user-1',
      browser: { fbp: 'fb.1.1763299999999.123', fbc: 'fb.1.1763299999999.AbC', ip: '201.1.2.3', ua: 'Mozilla/5.0' },
      customData: { value: 39.2, currency: 'USD', predicted_ltv: 235.2 },
    })
    const ev = p.data[0]
    expect(ev).toMatchObject({ event_name: 'Subscribe', event_id: 'subscribe_in_1', event_time: 1763300000, action_source: 'website' })
    expect(ev.user_data.em).toEqual([sha256('ana@empresa.mx')])
    expect(ev.user_data.em[0]).toMatch(/^[a-f0-9]{64}$/)
    expect(ev.user_data.external_id).toEqual([sha256('user-1')])
    expect(ev.user_data).toMatchObject({ fbp: 'fb.1.1763299999999.123', client_ip_address: '201.1.2.3', client_user_agent: 'Mozilla/5.0' })
    expect(ev.custom_data).toEqual({ value: 39.2, currency: 'USD', predicted_ltv: 235.2 })
    expect(p.test_event_code).toBeUndefined()
  })
  it('sin user agent es un cobro automático (system_generated) y agrega el código de prueba si existe', () => {
    const p = buildMetaEventPayload({ eventName: 'Subscribe', eventId: 'x', email: 'a@b.com' }, 'TEST123')
    expect(p.data[0].action_source).toBe('system_generated')
    expect(p.test_event_code).toBe('TEST123')
  })
  it('solo guarda cookies del píxel con formato válido', () => {
    expect(sanitizeBrowserContext({ fbp: 'fb.1.1763299999999.987654', fbc: 'basura', ip: '1.2.3.4', ua: 'UA' }))
      .toEqual({ meta_fbp: 'fb.1.1763299999999.987654', meta_ip: '1.2.3.4', meta_ua: 'UA' })
    expect(sanitizeBrowserContext({})).toEqual({})
  })
  it('LTV: 6 meses en mensual, el año en anual', () => {
    expect(predictedLtv(39.2, 'month')).toBe(235.2)
    expect(predictedLtv(400, 'year')).toBe(400)
  })
})
