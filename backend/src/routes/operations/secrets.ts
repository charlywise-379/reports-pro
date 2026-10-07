import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { requireAdmin, requireSuperAdmin } from '../../middleware/requireAdmin'
import { SECRET_DEFS, GROUP_LABELS, getSecretDef, validateSecretValue, maskValue, detectMode } from '../../lib/secretsRegistry'
import { getSecret, getSecretSource, isOverrideCorrupt, invalidateSecrets } from '../../lib/config'
import { getMasterKey, encryptSecret } from '../../lib/secretsCrypto'
import { hasTester, runSecretTest, warningsForNewValue } from '../../lib/secretsTesters'
import { configuredPriceIds } from '../../lib/stripePriceMap'

const router = Router()
router.use(requireAdmin, requireSuperAdmin)

const testLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => (req as Request).adminId || ipKeyGenerator(req.ip || ''),
  message: { error: 'Demasiadas pruebas. Espera un minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
})

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => (req as Request).adminId || ipKeyGenerator(req.ip || ''),
  message: { error: 'Demasiados intentos. Espera unos minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// 403 (no 401): adminFetch redirige todo 401 al login y ocultaría el mensaje.
async function passwordOk(adminId: string | undefined, password: unknown): Promise<boolean> {
  if (!adminId || typeof password !== 'string' || !password) return false
  const admin = await prisma.adminUser.findUnique({ where: { id: adminId }, select: { passwordHash: true } })
  return !!admin && bcrypt.compare(password, admin.passwordHash)
}

async function audit(key: string, action: 'SET' | 'REVERT' | 'TEST', adminId: string, success = true) {
  try {
    await prisma.secretAuditLog.create({ data: { key, action, adminId, success } })
  } catch (e) {
    console.error('[secrets] no se pudo escribir la bitácora', e)
  }
}

// GET / — estado de todas las llaves editables, agrupadas
router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await prisma.platformSecret.findMany({ select: { key: true, updatedAt: true, updatedById: true } })
    const adminIds = [...new Set(rows.map(r => r.updatedById))]
    const admins = adminIds.length
      ? await prisma.adminUser.findMany({ where: { id: { in: adminIds } }, select: { id: true, fullName: true } })
      : []
    const nameById = new Map(admins.map(a => [a.id, a.fullName]))
    const rowByKey = new Map(rows.map(r => [r.key, r]))

    const groups = new Map<string, { group: string; label: string; items: any[] }>()
    for (const def of SECRET_DEFS) {
      const value = getSecret(def.key)
      const row = rowByKey.get(def.key)
      const item = {
        key: def.key,
        label: def.label,
        sensitive: def.sensitive,
        configured: !!value,
        source: getSecretSource(def.key),
        masked: value ? maskValue(value, def.sensitive) : null,
        mode: value ? detectMode(def.key, value) : undefined,
        corrupt: isOverrideCorrupt(def.key),
        testable: hasTester(def.key),
        updatedAt: row ? row.updatedAt.toISOString() : null,
        updatedBy: row ? nameById.get(row.updatedById) || 'Admin eliminado' : null,
      }
      if (!groups.has(def.group)) groups.set(def.group, { group: def.group, label: GROUP_LABELS[def.group], items: [] })
      groups.get(def.group)!.items.push(item)
    }
    res.json({ writable: !!getMasterKey(), groups: [...groups.values()] })
  } catch (e: any) {
    console.error('[operations/secrets] error:', e)
    res.status(500).json({ error: 'Error interno' })
  }
})

// GET /audit — últimas 50 acciones (sin valores)
router.get('/audit', async (_req: Request, res: Response) => {
  try {
    const logs = await prisma.secretAuditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 50 })
    const ids = [...new Set(logs.map(l => l.adminId))]
    const admins = ids.length
      ? await prisma.adminUser.findMany({ where: { id: { in: ids } }, select: { id: true, fullName: true } })
      : []
    const nameById = new Map(admins.map(a => [a.id, a.fullName]))
    res.json({
      entries: logs.map(l => ({
        id: l.id, key: l.key, action: l.action, success: l.success,
        createdAt: l.createdAt.toISOString(), adminName: nameById.get(l.adminId) || 'Admin eliminado',
      })),
    })
  } catch (e: any) {
    console.error('[operations/secrets] error:', e)
    res.status(500).json({ error: 'Error interno' })
  }
})

const putSchema = z.object({ value: z.string(), password: z.string() })

// PUT /:key — guardar override cifrado
router.put('/:key', writeLimiter, async (req: Request, res: Response) => {
  try {
    const key = String(req.params.key)
    if (!getSecretDef(key)) return res.status(404).json({ error: 'Llave no editable' })
    const master = getMasterKey()
    if (!master) return res.status(409).json({ error: 'Falta SECRETS_MASTER_KEY en Railway — modo solo lectura' })

    const parsed = putSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' })
    if (!(await passwordOk(req.adminId, parsed.data.password))) {
      return res.status(403).json({ error: 'Contraseña incorrecta' })
    }

    const v = validateSecretValue(key, parsed.data.value)
    if (!v.ok) return res.status(400).json({ error: v.error })

    const warnings = await warningsForNewValue(key, v.value, configuredPriceIds())

    await prisma.platformSecret.upsert({
      where: { key },
      create: { key, ciphertext: encryptSecret(v.value, master), updatedById: req.adminId! },
      update: { ciphertext: encryptSecret(v.value, master), updatedById: req.adminId! },
    })
    await audit(key, 'SET', req.adminId!)
    await invalidateSecrets()
    res.json({ ok: true, warnings })
  } catch (e: any) {
    console.error('[operations/secrets] error:', e)
    res.status(500).json({ error: 'Error interno' })
  }
})

const deleteSchema = z.object({ password: z.string() })

// DELETE /:key — volver al valor de Railway
router.delete('/:key', writeLimiter, async (req: Request, res: Response) => {
  try {
    const key = String(req.params.key)
    if (!getSecretDef(key)) return res.status(404).json({ error: 'Llave no editable' })
    if (!getMasterKey()) return res.status(409).json({ error: 'Falta SECRETS_MASTER_KEY en Railway — modo solo lectura' })

    const parsed = deleteSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' })
    if (!(await passwordOk(req.adminId, parsed.data.password))) {
      return res.status(403).json({ error: 'Contraseña incorrecta' })
    }

    await prisma.platformSecret.deleteMany({ where: { key } })
    await audit(key, 'REVERT', req.adminId!)
    await invalidateSecrets()
    res.json({ ok: true })
  } catch (e: any) {
    console.error('[operations/secrets] error:', e)
    res.status(500).json({ error: 'Error interno' })
  }
})

// POST /:key/test — prueba de conexión con el valor vigente
router.post('/:key/test', testLimiter, async (req: Request, res: Response) => {
  const key = String(req.params.key)
  if (!getSecretDef(key)) return res.status(404).json({ error: 'Llave no editable' })
  if (!hasTester(key)) return res.status(400).json({ error: 'Esta llave no tiene prueba de conexión' })
  const value = getSecret(key)
  if (!value) return res.json({ ok: false, error: 'La llave no está configurada' })
  try {
    await runSecretTest(key, value)
    await audit(key, 'TEST', req.adminId!, true)
    res.json({ ok: true })
  } catch (e: any) {
    await audit(key, 'TEST', req.adminId!, false)
    res.json({ ok: false, error: e?.message || 'La prueba falló' })
  }
})

export default router
