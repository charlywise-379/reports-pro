import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

// Formato: base64(iv[12] | tag[16] | data). AES-256-GCM.
const IV_LEN = 12
const TAG_LEN = 16

// Llave maestra para cifrar los overrides de llaves en BD. Vive SOLO en
// Railway. Inválida o ausente → null (el backend sigue con process.env).
export function getMasterKey(): Buffer | null {
  const raw = process.env.SECRETS_MASTER_KEY
  if (!raw || !/^[A-Za-z0-9+/]+={0,2}$/.test(raw.trim())) return null
  const buf = Buffer.from(raw.trim(), 'base64')
  return buf.length === 32 ? buf : null
}

export function encryptSecret(plain: string, key: Buffer): string {
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64')
}

export function decryptSecret(ciphertext: string, key: Buffer): string {
  const buf = Buffer.from(ciphertext, 'base64')
  if (buf.length < IV_LEN + TAG_LEN) throw new Error('ciphertext demasiado corto')
  const iv = buf.subarray(0, IV_LEN)
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN)
  const data = buf.subarray(IV_LEN + TAG_LEN)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}
