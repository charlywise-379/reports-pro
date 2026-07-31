import { Router, Request, Response } from 'express'
import { prisma } from '../../lib/prisma'
import { requireAdmin } from '../../middleware/requireAdmin'

const router = Router()

const VALID_MODULES = ['COMPETITIVE_INTELLIGENCE', 'CORPORATE_HEALTH', 'CYBERSECURITY_RADAR'] as const
type ModuleFilter = typeof VALID_MODULES[number] | undefined

function moduleWhere(module: ModuleFilter) {
  return module ? { project: { serviceType: module as any } } : {}
}

function moduleWhereDirect(module: ModuleFilter) {
  return module ? { serviceType: module as any } : {}
}

router.get('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const moduleParam = req.query.module as string | undefined
    const module: ModuleFilter = moduleParam && VALID_MODULES.includes(moduleParam as any) ? (moduleParam as any) : undefined

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const [activeReports, activeUsers, activeSubs, subsThisMonth, subsThisWeek, subsByFrequency] = await Promise.all([
      prisma.report.count({
        where: { status: { in: ['GENERATING', 'QUEUED'] }, ...moduleWhere(module) },
      }),
      prisma.project.findMany({
        where: { status: { notIn: ['CANCELLED', 'EXPIRED'] }, ...moduleWhereDirect(module) },
        select: { userId: true },
        distinct: ['userId'],
      }),
      prisma.subscription.findMany({
        where: { status: { in: ['ACTIVE', 'TRIALING'] }, ...(module ? { project: { serviceType: module as any } } : {}) },
        select: { pricePerMonth: true, frequency: true, createdAt: true },
      }),
      prisma.subscription.findMany({
        where: { status: { in: ['ACTIVE', 'TRIALING'] }, createdAt: { gte: startOfMonth }, ...(module ? { project: { serviceType: module as any } } : {}) },
        select: { pricePerMonth: true },
      }),
      prisma.subscription.findMany({
        where: { status: { in: ['ACTIVE', 'TRIALING'] }, createdAt: { gte: startOfWeek }, ...(module ? { project: { serviceType: module as any } } : {}) },
        select: { pricePerMonth: true },
      }),
      prisma.subscription.groupBy({
        by: ['frequency'],
        where: { status: { in: ['ACTIVE', 'TRIALING'] }, ...(module ? { project: { serviceType: module as any } } : {}) },
        _count: true,
      }),
    ])

    const monthlyRevenue = activeSubs.reduce((sum, s) => sum + s.pricePerMonth, 0)
    const revenueThisMonth = subsThisMonth.reduce((sum, s) => sum + s.pricePerMonth, 0)
    const revenueThisWeek = subsThisWeek.reduce((sum, s) => sum + s.pricePerMonth, 0)

    // Tendencia de ingresos y nuevas suscripciones — últimos 6 meses
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const recentSubs = await prisma.subscription.findMany({
      where: { createdAt: { gte: sixMonthsAgo }, ...(module ? { project: { serviceType: module as any } } : {}) },
      select: { pricePerMonth: true, createdAt: true, status: true },
    })

    const monthBuckets: Record<string, { revenue: number; newSubs: number }> = {}
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthBuckets[key] = { revenue: 0, newSubs: 0 }
    }
    for (const sub of recentSubs) {
      const d = new Date(sub.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (monthBuckets[key]) {
        monthBuckets[key].newSubs += 1
        if (sub.status === 'ACTIVE' || sub.status === 'TRIALING') {
          monthBuckets[key].revenue += sub.pricePerMonth
        }
      }
    }
    const trend = Object.entries(monthBuckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }))

    res.json({
      activeReports,
      activeUsers: activeUsers.length,
      activeSubscriptions: activeSubs.length,
      revenueThisMonth,
      revenueThisWeek,
      monthlyRecurringRevenue: monthlyRevenue,
      subscriptionsByFrequency: subsByFrequency.map(f => ({ frequency: f.frequency, count: f._count })),
      trend,
    })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

export default router
