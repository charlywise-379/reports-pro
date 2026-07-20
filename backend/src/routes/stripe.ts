import { Router, Request, Response } from 'express'
import { stripe, PLANS, MXN_RATE } from '../lib/stripe'
import { prisma } from '../lib/prisma'
import { getPriceAmountMXN } from '../lib/stripePriceMap'

const router = Router()

// POST /api/stripe/create-checkout-session
router.post('/create-checkout-session', async (req: Request, res: Response) => {
  try {
    const { userId, priceId, billingCycle } = req.body

    if (!userId || !priceId) {
      return res.status(400).json({ error: 'userId y priceId requeridos' })
    }

    // Buscar proyecto del usuario
    const project = await (prisma.project as any).findFirst({ where: { userId } })
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' })

    // Buscar o crear customer en Stripe
    let customerId: string
    const existingSub = await (prisma.subscription as any).findFirst({ where: { projectId: project.id } })

    if (existingSub?.stripeCustomerId) {
      customerId = existingSub.stripeCustomerId
    } else {
      const user = await (prisma.user as any).findUnique({ where: { id: userId } })
      const customer = await stripe.customers.create({
        email: user?.email || '',
        metadata: { userId, projectId: project.id }
      })
      customerId = customer.id
    }

    const FRONTEND_URL = process.env.FRONTEND_URL || 'https://reports-pro.vercel.app'

    // Verificar si el usuario ya uso su trial
    const existingSubCheck = await (prisma.subscription as any).findFirst({ where: { projectId: project.id } })
    const yaUsoTrial = existingSubCheck?.trialStartedAt != null

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      subscription_data: {
        ...(yaUsoTrial ? {} : { trial_period_days: 7 }),
        metadata: { userId, projectId: project.id, billingCycle: billingCycle || 'monthly' }
      },
      success_url: `${FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/checkout/cancel`,
      metadata: { userId, projectId: project.id }
    })

    res.json({ url: session.url })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/stripe/webhook
router.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string
  let event: any

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    )
  } catch (e: any) {
    return res.status(400).json({ error: `Webhook error: ${e.message}` })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const { userId, projectId } = session.metadata
        const sub = await stripe.subscriptions.retrieve(session.subscription)

        // Obtener frecuencia del proyecto para el campo requerido
        const proj = await (prisma.project as any).findUnique({ where: { id: projectId } })
        const freq = proj?.frequency || 'WEEKLY'

        const priceId = sub.items.data[0].price.id
        const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000) : new Date(Date.now() + 7*24*60*60*1000)

        await (prisma.subscription as any).upsert({
          where: { projectId },
          create: {
            projectId,
            userId,
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            stripePriceId: priceId,
            status: 'TRIALING',
            frequency: freq,
            pricePerMonth: getPriceAmountMXN(priceId),
            trialEndsAt: trialEnd,
          },
          update: {
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            stripePriceId: priceId,
            status: 'TRIALING',
            pricePerMonth: getPriceAmountMXN(priceId),
            trialEndsAt: trialEnd,
          }
        })

        await (prisma.project as any).update({
          where: { id: projectId },
          data: { status: 'TRIAL' }
        })
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object
        const projectId = sub.metadata?.projectId
        if (!projectId) break

        const updateData: any = {
          status: sub.status.toUpperCase(),
        }
        if (sub.current_period_start) {
          updateData.currentPeriodStart = new Date(sub.current_period_start * 1000)
        }
        if (sub.current_period_end) {
          updateData.currentPeriodEnd = new Date(sub.current_period_end * 1000)
        }

        await (prisma.subscription as any).updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: updateData
        })
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object
        await (prisma.subscription as any).updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: { status: 'CANCELED' }
        })
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        await (prisma.subscription as any).updateMany({
          where: { stripeSubscriptionId: invoice.subscription },
          data: { status: 'PAST_DUE' }
        })
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        await (prisma.subscription as any).updateMany({
          where: { stripeSubscriptionId: invoice.subscription },
          data: { status: 'ACTIVE' }
        })
        break
      }
    }

    res.json({ received: true })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/stripe/portal — genera link al portal de Stripe para gestionar suscripcion
router.post('/portal', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body
    if (!userId) return res.status(400).json({ error: 'userId requerido' })

    const project = await (prisma.project as any).findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' })

    const sub = await (prisma.subscription as any).findFirst({
      where: { projectId: project.id }
    })
    if (!sub?.stripeSubscriptionId) {
      return res.status(400).json({ error: 'No tienes una suscripcion activa en Stripe' })
    }

    // Obtener customerId desde Stripe usando el subscriptionId
    const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId)
    const customerId = stripeSub.customer as string

    const FRONTEND_URL = process.env.FRONTEND_URL || 'https://reports-pro.vercel.app'

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${FRONTEND_URL}/dashboard`,
    })

    res.json({ url: portalSession.url })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})



// GET /api/stripe/verify-session/:sessionId — fallback cuando webhook tarda
router.get('/verify-session/:sessionId', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId as string
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] })
    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return res.json({ ready: false, status: session.status })
    }
    const meta = session.metadata as any
    const userId = meta?.userId
    const projectId = meta?.projectId
    if (!userId || !projectId) return res.json({ ready: false, reason: 'no_metadata' })
    const sub = session.subscription as any
    if (!sub || typeof sub === 'string') return res.json({ ready: false, reason: 'no_subscription' })
    const proj = await (prisma.project as any).findUnique({ where: { id: projectId } })
    const freq = proj?.frequency || 'WEEKLY'
    await (prisma.subscription as any).upsert({
      where: { projectId },
      create: {
        projectId, userId,
        stripeSubscriptionId: sub.id,
        stripePriceId: sub.items?.data[0]?.price?.id || '',
        status: 'TRIALING', frequency: freq,
        pricePerMonth: getPriceAmountMXN(sub.items?.data[0]?.price?.id),
        trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : new Date(Date.now() + 7*24*60*60*1000),
      },
      update: {
        stripeSubscriptionId: sub.id,
        stripePriceId: sub.items?.data[0]?.price?.id || '',
        status: sub.status === 'trialing' ? 'TRIALING' : 'ACTIVE',
        trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : undefined,
      }
    })
    await (prisma.project as any).update({ where: { id: projectId }, data: { status: 'TRIAL' } })
    console.log('[VerifySession] OK:', projectId)
    res.json({ ready: true, projectId, status: sub.status })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

export default router
