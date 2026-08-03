import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { stripe } from '../../lib/stripe'
import { requireAdmin } from '../../middleware/requireAdmin'

const router = Router()

router.get('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { module, status, frequency, page = '1', pageSize = '25' } = req.query as Record<string, string>
    const skip = (parseInt(page) - 1) * parseInt(pageSize)
    const take = parseInt(pageSize)

    const where: any = {}
    if (status) where.status = status
    if (frequency) where.frequency = frequency
    if (module) where.project = { serviceType: module }

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true, fullName: true } }, project: { select: { name: true, serviceType: true } } },
      }),
      prisma.subscription.count({ where }),
    ])

    res.json({ subscriptions, total, page: parseInt(page), pageSize: take })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/export', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { module, status, frequency } = req.query as Record<string, string>
    const where: any = {}
    if (status) where.status = status
    if (frequency) where.frequency = frequency
    if (module) where.project = { serviceType: module }

    const subscriptions = await prisma.subscription.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { email: true } }, project: { select: { name: true, serviceType: true } } },
    })

    const header = 'id,userEmail,projectName,module,frequency,pricePerMonth,status,trialEndsAt,createdAt\n'
    const rows = subscriptions.map(s =>
      [s.id, s.user.email, s.project.name, s.project.serviceType, s.frequency, s.pricePerMonth, s.status, s.trialEndsAt?.toISOString() || '', s.createdAt.toISOString()]
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    ).join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="suscripciones.csv"')
    res.send(header + rows)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: { user: true, project: true },
    })
    if (!subscription) return res.status(404).json({ error: 'Suscripción no encontrada' })
    res.json(subscription)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/:id/cancel', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const subscription = await prisma.subscription.findUnique({ where: { id } })
    if (!subscription) return res.status(404).json({ error: 'Suscripción no encontrada' })

    if (subscription.stripeSubscriptionId) {
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId).catch(() => {})
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: 'Cancelado por administrador' },
    })

    await prisma.auditLog.create({
      data: { userId: req.adminId!, event: 'admin_cancel_subscription', metadata: { subscriptionId: id } },
    })

    res.json(updated)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

const extendTrialSchema = z.object({ days: z.number().int().positive().max(90) })

router.post('/:id/extend-trial', requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = extendTrialSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Número de días inválido (1-90)' })

    const id = req.params.id as string
    const subscription = await prisma.subscription.findUnique({ where: { id } })
    if (!subscription) return res.status(404).json({ error: 'Suscripción no encontrada' })

    const currentTrialEnd = subscription.trialEndsAt > new Date() ? subscription.trialEndsAt : new Date()
    const newTrialEnd = new Date(currentTrialEnd.getTime() + parsed.data.days * 24 * 60 * 60 * 1000)

    const updated = await prisma.subscription.update({
      where: { id },
      data: { trialEndsAt: newTrialEnd },
    })

    await prisma.auditLog.create({
      data: { userId: req.adminId!, event: 'admin_extend_trial', metadata: { subscriptionId: id, days: parsed.data.days, newTrialEnd } },
    })

    res.json(updated)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

const changeFrequencySchema = z.object({ frequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY']) })

router.patch('/:id/frequency', requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = changeFrequencySchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Frecuencia inválida' })

    const id = req.params.id as string
    const subscription = await prisma.subscription.findUnique({ where: { id } })
    if (!subscription) return res.status(404).json({ error: 'Suscripción no encontrada' })

    const [updatedSub] = await prisma.$transaction([
      prisma.subscription.update({ where: { id }, data: { frequency: parsed.data.frequency } }),
      prisma.project.update({ where: { id: subscription.projectId }, data: { frequency: parsed.data.frequency } }),
    ])

    await prisma.auditLog.create({
      data: { userId: req.adminId!, event: 'admin_change_frequency', metadata: { subscriptionId: id, newFrequency: parsed.data.frequency } },
    })

    res.json(updatedSub)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

export default router
