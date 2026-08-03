import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { requireAdmin, requireSuperAdmin } from '../../middleware/requireAdmin'

const router = Router()

router.use(requireAdmin, requireSuperAdmin)

router.get('/', async (req: Request, res: Response) => {
  try {
    const admins = await prisma.adminUser.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, fullName: true, role: true, createdAt: true },
    })
    res.json({ admins })
  } catch (e: any) {
    console.error('[operations] error:', e)
    res.status(500).json({ error: 'Error interno' })
  }
})

const createAdminSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  password: z.string().min(8),
  role: z.enum(['ADMIN', 'SUPER_ADMIN']).default('ADMIN'),
})

router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createAdminSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos', message: parsed.error.message })

    const existing = await prisma.adminUser.findUnique({ where: { email: parsed.data.email.toLowerCase() } })
    if (existing) return res.status(409).json({ error: 'Ya existe un administrador con ese email' })

    const passwordHash = await bcrypt.hash(parsed.data.password, 12)
    const admin = await prisma.adminUser.create({
      data: {
        email: parsed.data.email.toLowerCase(),
        fullName: parsed.data.fullName,
        passwordHash,
        role: parsed.data.role,
      },
    })

    await prisma.auditLog.create({
      data: { userId: req.adminId!, event: 'admin_create_admin', metadata: { newAdminId: admin.id, email: admin.email, role: admin.role } },
    })

    res.status(201).json({ id: admin.id, email: admin.email, fullName: admin.fullName, role: admin.role })
  } catch (e: any) {
    console.error('[operations] error:', e)
    res.status(500).json({ error: 'Error interno' })
  }
})

const updateAdminSchema = z.object({
  fullName: z.string().min(1).optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['ADMIN', 'SUPER_ADMIN']).optional(),
})

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const target = await prisma.adminUser.findUnique({ where: { id } })
    if (!target) return res.status(404).json({ error: 'Administrador no encontrado' })

    const parsed = updateAdminSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' })

    if (target.role === 'SUPER_ADMIN' && parsed.data.role === 'ADMIN') {
      return res.status(403).json({ error: 'No se puede degradar al Super Admin' })
    }

    const data: any = {}
    if (parsed.data.fullName) data.fullName = parsed.data.fullName
    if (parsed.data.role) data.role = parsed.data.role
    if (parsed.data.password) data.passwordHash = await bcrypt.hash(parsed.data.password, 12)

    const updated = await prisma.adminUser.update({ where: { id }, data })

    await prisma.auditLog.create({
      data: { userId: req.adminId!, event: 'admin_update_admin', metadata: { targetAdminId: id, changes: { ...parsed.data, password: parsed.data.password ? '[redacted]' : undefined } } },
    })

    res.json({ id: updated.id, email: updated.email, fullName: updated.fullName, role: updated.role })
  } catch (e: any) {
    console.error('[operations] error:', e)
    res.status(500).json({ error: 'Error interno' })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const target = await prisma.adminUser.findUnique({ where: { id } })
    if (!target) return res.status(404).json({ error: 'Administrador no encontrado' })

    if (target.role === 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'No se puede eliminar al Super Admin' })
    }

    await prisma.adminUser.delete({ where: { id } })

    await prisma.auditLog.create({
      data: { userId: req.adminId!, event: 'admin_delete_admin', metadata: { targetAdminId: id, email: target.email } },
    })

    res.json({ ok: true })
  } catch (e: any) {
    console.error('[operations] error:', e)
    res.status(500).json({ error: 'Error interno' })
  }
})

export default router
