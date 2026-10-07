import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { randomBytes } from 'crypto'
import { encryptSecret } from './secretsCrypto'
import {
  getSecret, getSecretSource, isOverrideCorrupt, secretsVersion, loadSecrets, __resetSecretsForTests,
} from './config'

const OLD_ENV = { ...process.env }
const master = randomBytes(32)

beforeEach(() => {
  __resetSecretsForTests()
  process.env = { ...OLD_ENV, SECRETS_MASTER_KEY: master.toString('base64') }
})
afterEach(() => { process.env = { ...OLD_ENV } })

const row = (key: string, value: string) => ({ key, ciphertext: encryptSecret(value, master) })

describe('getSecret', () => {
  it('override de BD gana sobre process.env', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_env'
    await loadSecrets(async () => [row('STRIPE_SECRET_KEY', 'sk_live_db')])
    expect(getSecret('STRIPE_SECRET_KEY')).toBe('sk_live_db')
    expect(getSecretSource('STRIPE_SECRET_KEY')).toBe('override')
  })

  it('sin override usa process.env; sin nada → undefined/none', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_env'
    delete process.env.STRIPE_WEBHOOK_SECRET
    await loadSecrets(async () => [])
    expect(getSecret('STRIPE_SECRET_KEY')).toBe('sk_test_env')
    expect(getSecretSource('STRIPE_SECRET_KEY')).toBe('env')
    expect(getSecret('STRIPE_WEBHOOK_SECRET')).toBeUndefined()
    expect(getSecretSource('STRIPE_WEBHOOK_SECRET')).toBe('none')
  })

  it('ignora filas de llaves fuera de la allowlist', async () => {
    process.env.DATABASE_URL = 'postgres://env'
    await loadSecrets(async () => [row('DATABASE_URL', 'postgres://hack')])
    expect(getSecret('DATABASE_URL')).toBe('postgres://env')
  })

  it('override corrupto se ignora y se marca', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_env'
    await loadSecrets(async () => [{ key: 'STRIPE_SECRET_KEY', ciphertext: 'basura' }])
    expect(getSecret('STRIPE_SECRET_KEY')).toBe('sk_test_env')
    expect(isOverrideCorrupt('STRIPE_SECRET_KEY')).toBe(true)
  })

  it('sin master key ignora overrides', async () => {
    delete process.env.SECRETS_MASTER_KEY
    process.env.STRIPE_SECRET_KEY = 'sk_test_env'
    await loadSecrets(async () => [row('STRIPE_SECRET_KEY', 'sk_live_db')])
    expect(getSecret('STRIPE_SECRET_KEY')).toBe('sk_test_env')
  })
})

describe('versión y resiliencia', () => {
  it('sube la versión solo si cambió algo', async () => {
    const v0 = secretsVersion()
    await loadSecrets(async () => [row('STRIPE_SECRET_KEY', 'sk_live_a')])
    const v1 = secretsVersion()
    expect(v1).toBeGreaterThan(v0)
    await loadSecrets(async () => [row('STRIPE_SECRET_KEY', 'sk_live_a')])
    expect(secretsVersion()).toBe(v1)
    await loadSecrets(async () => [row('STRIPE_SECRET_KEY', 'sk_live_b')])
    expect(secretsVersion()).toBeGreaterThan(v1)
  })

  it('si la BD falla conserva el último mapa bueno', async () => {
    await loadSecrets(async () => [row('STRIPE_SECRET_KEY', 'sk_live_ok')])
    await loadSecrets(async () => { throw new Error('BD caída') })
    expect(getSecret('STRIPE_SECRET_KEY')).toBe('sk_live_ok')
  })

  it('una carga lenta y vieja no pisa una más nueva ya aplicada', async () => {
    let releaseA!: () => void
    const gate = new Promise<void>(r => { releaseA = r })
    const a = loadSecrets(async () => { await gate; return [row('STRIPE_SECRET_KEY', 'sk_live_old')] })
    const b = loadSecrets(async () => [row('STRIPE_SECRET_KEY', 'sk_live_new')])
    await b
    releaseA()
    await a
    expect(getSecret('STRIPE_SECRET_KEY')).toBe('sk_live_new')
  })
})
