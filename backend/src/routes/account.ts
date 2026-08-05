import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { stripe } from '../lib/stripe'
import { requireAuth } from '../middleware/auth'

const router = Router()

function serializeUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    company: user.company,
    city: user.city,
    state: user.state,
    country: user.country,
  }
}

router.get('/:userId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    if (userId !== req.userId) {
      return res.status(403).json({ error: 'No tienes permiso para ver esta cuenta' })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })

    const projects = await (prisma.project as any).findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: true,
        reports: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, createdAt: true, reportTitle: true, status: true },
        },
      },
    })

    const subscriptions = projects
      .filter((p: any) => p.subscription)
      .map((p: any) => ({
        id: p.subscription.id,
        projectId: p.id,
        projectName: p.name,
        serviceType: p.serviceType,
        status: p.subscription.status,
        frequency: p.subscription.frequency,
        pricePerMonth: p.subscription.pricePerMonth,
        stripeCurrentPeriodEnd: p.subscription.stripeCurrentPeriodEnd,
        trialEndsAt: p.subscription.trialEndsAt,
      }))

    const reports = projects.flatMap((p: any) =>
      (p.reports || []).map((r: any) => ({
        id: r.id,
        projectId: p.id,
        projectName: p.name,
        serviceType: p.serviceType,
        createdAt: r.createdAt,
        reportTitle: r.reportTitle,
        status: r.status,
      }))
    )

    res.json({ user: serializeUser(user), subscriptions, reports })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.patch('/:userId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    if (userId !== req.userId) {
      return res.status(403).json({ error: 'No tienes permiso para editar esta cuenta' })
    }

    const { firstName, lastName, phone, company, city, state, country } = req.body
    if (typeof firstName !== 'string' || !firstName.trim()) {
      return res.status(400).json({ error: 'Nombre requerido' })
    }
    if (typeof lastName !== 'string' || !lastName.trim()) {
      return res.status(400).json({ error: 'Apellido requerido' })
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName: `${firstName.trim()} ${lastName.trim()}`,
        phone: typeof phone === 'string' && phone.trim() ? phone.trim() : null,
        company: typeof company === 'string' && company.trim() ? company.trim() : null,
        city: typeof city === 'string' && city.trim() ? city.trim() : null,
        state: typeof state === 'string' && state.trim() ? state.trim() : null,
        country: typeof country === 'string' && country.trim() ? country.trim() : null,
      },
    })

    res.json({ user: serializeUser(user) })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/:userId/invoices', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    if (userId !== req.userId) {
      return res.status(403).json({ error: 'No tienes permiso para ver esta cuenta' })
    }

    const subscriptions = await (prisma.subscription as any).findMany({
      where: { userId },
      select: { stripeCustomerId: true },
    })
    const customerIds = [...new Set(subscriptions.map((s: any) => s.stripeCustomerId).filter(Boolean))] as string[]

    if (customerIds.length === 0) {
      return res.json({ invoices: [] })
    }

    try {
      const invoiceLists = await Promise.all(
        customerIds.map(customerId => stripe.invoices.list({ customer: customerId, limit: 20 }))
      )
      const invoices = invoiceLists
        .flatMap(list => list.data)
        .sort((a, b) => (b.created || 0) - (a.created || 0))
        .map(inv => ({
          id: inv.id,
          date: new Date((inv.created || 0) * 1000),
          amountFormatted: `$${((inv.amount_paid ?? inv.amount_due ?? 0) / 100).toFixed(2)} ${(inv.currency || 'usd').toUpperCase()}`,
          status: inv.status,
          hostedInvoiceUrl: inv.hosted_invoice_url,
          pdfUrl: inv.invoice_pdf,
        }))

      res.json({ invoices })
    } catch (stripeError: any) {
      console.error('Error obteniendo facturas de Stripe:', stripeError)
      res.json({ invoices: [], error: true })
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

export default router
