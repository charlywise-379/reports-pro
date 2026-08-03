import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { requireAdmin } from '../../middleware/requireAdmin'
import { supabaseAdmin } from '../../lib/supabaseAdmin'

const router = Router()

router.get('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { module, status, search, page = '1', pageSize = '25' } = req.query as Record<string, string>
    const skip = (parseInt(page) - 1) * parseInt(pageSize)
    const take = parseInt(pageSize)

    const where: any = {}
    if (status === 'suspended') where.isSuspended = true
    if (status === 'active') where.isSuspended = false
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (module) where.projects = { some: { serviceType: module } }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { projects: { select: { id: true, serviceType: true, status: true } } },
      }),
      prisma.user.count({ where }),
    ])

    res.json({
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        phone: u.phone,
        isSuspended: u.isSuspended,
        createdAt: u.createdAt,
        projectCount: u.projects.length,
        modules: [...new Set(u.projects.map(p => p.serviceType))],
      })),
      total,
      page: parseInt(page),
      pageSize: take,
    })
  } catch (e: any) {
    console.error('[operations] error:', e)
    res.status(500).json({ error: 'Error interno' })
  }
})

router.get('/export', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { module, status, search } = req.query as Record<string, string>
    const where: any = {}
    if (status === 'suspended') where.isSuspended = true
    if (status === 'active') where.isSuspended = false
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (module) where.projects = { some: { serviceType: module } }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { projects: { select: { serviceType: true } } },
    })

    const header = 'id,email,fullName,phone,isSuspended,createdAt,modules\n'
    const rows = users.map(u =>
      [u.id, u.email, u.fullName || '', u.phone || '', u.isSuspended, u.createdAt.toISOString(), [...new Set(u.projects.map(p => p.serviceType))].join('|')]
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    ).join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="usuarios.csv"')
    res.send(header + rows)
  } catch (e: any) {
    console.error('[operations] error:', e)
    res.status(500).json({ error: 'Error interno' })
  }
})

router.get('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        projects: { include: { subscription: true, reports: { orderBy: { createdAt: 'desc' }, take: 10 } } },
      },
    })
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })
    res.json(user)
  } catch (e: any) {
    console.error('[operations] error:', e)
    res.status(500).json({ error: 'Error interno' })
  }
})

const updateUserSchema = z.object({
  fullName: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
})

router.patch('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const parsed = updateUserSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' })

    const user = await prisma.user.update({ where: { id }, data: parsed.data })

    await prisma.auditLog.create({
      data: { userId: req.adminId!, event: 'admin_update_user', metadata: { targetUserId: id, changes: parsed.data } },
    })

    res.json(user)
  } catch (e: any) {
    console.error('[operations] error:', e)
    res.status(500).json({ error: 'Error interno' })
  }
})

const suspendSchema = z.object({ reason: z.string().min(1) })

router.post('/:id/suspend', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const parsed = suspendSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Motivo de suspensión requerido' })

    const user = await prisma.user.update({
      where: { id },
      data: { isSuspended: true, suspendedAt: new Date(), suspendedReason: parsed.data.reason },
    })

    await prisma.auditLog.create({
      data: { userId: req.adminId!, event: 'admin_suspend_user', metadata: { targetUserId: id, reason: parsed.data.reason } },
    })

    res.json(user)
  } catch (e: any) {
    console.error('[operations] error:', e)
    res.status(500).json({ error: 'Error interno' })
  }
})

router.post('/:id/reactivate', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const user = await prisma.user.update({
      where: { id },
      data: { isSuspended: false, suspendedAt: null, suspendedReason: null },
    })

    await prisma.auditLog.create({
      data: { userId: req.adminId!, event: 'admin_reactivate_user', metadata: { targetUserId: id } },
    })

    res.json(user)
  } catch (e: any) {
    console.error('[operations] error:', e)
    res.status(500).json({ error: 'Error interno' })
  }
})

router.post('/:id/reset-password', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })

    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: user.email,
    })
    if (error) return res.status(500).json({ error: 'No se pudo generar el link de recuperación' })

    await prisma.auditLog.create({
      data: { userId: req.adminId!, event: 'admin_reset_password', metadata: { targetUserId: id, email: user.email } },
    })

    res.json({ ok: true })
  } catch (e: any) {
    console.error('[operations] error:', e)
    res.status(500).json({ error: 'Error interno' })
  }
})

router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })

    await prisma.user.delete({ where: { id } })

    await prisma.auditLog.create({
      data: { userId: req.adminId!, event: 'admin_delete_user', metadata: { targetUserId: id, email: user.email } },
    })

    res.json({ ok: true })
  } catch (e: any) {
    console.error('[operations] error:', e)
    res.status(500).json({ error: 'Error interno' })
  }
})

export default router
