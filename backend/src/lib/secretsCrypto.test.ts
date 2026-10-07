import { describe, it, expect, afterEach } from 'vitest'
import { randomBytes } from 'crypto'
import { getMasterKey, encryptSecret, decryptSecret } from './secretsCrypto'

const OLD_ENV = { ...process.env }
afterEach(() => { process.env = { ...OLD_ENV } })

const key = randomBytes(32)

describe('secretsCrypto', () => {
  it('ida y vuelta devuelve el texto original', () => {
    const c = encryptSecret('sk_live_abc123', key)
    expect(decryptSecret(c, key)).toBe('sk_live_abc123')
  })

  it('usa un IV distinto en cada cifrado', () => {
    expect(encryptSecret('mismo', key)).not.toBe(encryptSecret('mismo', key))
  })

  it('lanza si el ciphertext fue alterado', () => {
    const c = Buffer.from(encryptSecret('valor', key), 'base64')
    c[c.length - 1] ^= 0xff
    expect(() => decryptSecret(c.toString('base64'), key)).toThrow()
  })

  it('lanza con otra llave maestra', () => {
    const c = encryptSecret('valor', key)
    expect(() => decryptSecret(c, randomBytes(32))).toThrow()
  })

  it('getMasterKey devuelve null si falta o no mide 32 bytes', () => {
    delete process.env.SECRETS_MASTER_KEY
    expect(getMasterKey()).toBeNull()
    process.env.SECRETS_MASTER_KEY = Buffer.alloc(16).toString('base64')
    expect(getMasterKey()).toBeNull()
    process.env.SECRETS_MASTER_KEY = 'no-es-base64-!!!'
    expect(getMasterKey()).toBeNull()
  })

  it('getMasterKey devuelve el buffer de 32 bytes', () => {
    process.env.SECRETS_MASTER_KEY = key.toString('base64')
    expect(getMasterKey()?.equals(key)).toBe(true)
  })
})
