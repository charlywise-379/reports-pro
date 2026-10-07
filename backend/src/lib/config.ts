import { createHash } from 'crypto'
import { getMasterKey, decryptSecret } from './secretsCrypto'
import { isEditableKey } from './secretsRegistry'

// Resolución de llaves en caliente: override cifrado en BD (editado desde
// /operations/secrets) → process.env (Railway) → undefined. getSecret() es
// síncrona y lee de un mapa en memoria que loadSecrets() refresca al
// arrancar, tras cada cambio (invalidateSecrets) y cada 60 s.

type Row = { key: string; ciphertext: string }

let overrides = new Map<string, string>()
let corrupt = new Set<string>()
let version = 0
let fingerprint = ''

export function getSecret(key: string): string | undefined {
  return overrides.get(key) ?? (process.env[key] || undefined)
}

export function getSecretSource(key: string): 'override' | 'env' | 'none' {
  if (overrides.has(key)) return 'override'
  return process.env[key] ? 'env' : 'none'
}

export function isOverrideCorrupt(key: string): boolean {
  return corrupt.has(key)
}

/** Sube cada vez que el mapa de overrides cambia; los getters de clientes
 * (getStripe, …) la comparan para saber si deben reconstruirse. */
export function secretsVersion(): number {
  return version
}

async function fetchRowsFromDb(): Promise<Row[]> {
  const { prisma } = await import('./prisma')
  return prisma.platformSecret.findMany({ select: { key: true, ciphertext: true } })
}

export async function loadSecrets(fetchRows: () => Promise<Row[]> = fetchRowsFromDb): Promise<void> {
  const master = getMasterKey()
  let rows: Row[] = []
  if (master) {
    try {
      rows = await fetchRows()
    } catch (e) {
      console.error('[secrets] no se pudieron cargar los overrides; se conserva el último mapa', e)
      return
    }
  }

  const next = new Map<string, string>()
  const nextCorrupt = new Set<string>()
  for (const r of rows) {
    if (!isEditableKey(r.key)) continue
    try {
      next.set(r.key, decryptSecret(r.ciphertext, master!))
    } catch {
      nextCorrupt.add(r.key)
      console.error(`[secrets] override corrupto para ${r.key}; se usa process.env`)
    }
  }

  const fp = createHash('sha256')
    .update(JSON.stringify([[...next.entries()].sort(), [...nextCorrupt].sort()]))
    .digest('hex')
  if (fp !== fingerprint) {
    fingerprint = fp
    overrides = next
    corrupt = nextCorrupt
    version++
  }
}

export function invalidateSecrets(): Promise<void> {
  return loadSecrets()
}

export function startSecretsRefresh(intervalMs = 60_000): NodeJS.Timeout {
  return setInterval(() => { loadSecrets().catch(() => {}) }, intervalMs)
}

export function __resetSecretsForTests(): void {
  overrides = new Map()
  corrupt = new Set()
  fingerprint = ''
  version = 0
}
