import { Router, Request, Response } from 'express'
import { stripe, PLANS, MXN_RATE } from '../lib/stripe'
import { prisma } from '../lib/prisma'

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

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      subscription_data: {
        trial_period_days: 7,
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

        await (prisma.subscription as any).upsert({
          where: { projectId },
          create: {
            projectId,
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            stripePriceId: sub.items.data[0].price.id,
            status: 'TRIALING',
            trialEndsAt: new Date(sub.trial_end! * 1000),
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
          },
          update: {
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            stripePriceId: sub.items.data[0].price.id,
            status: 'TRIALING',
            trialEndsAt: new Date(sub.trial_end! * 1000),
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

        await (prisma.subscription as any).updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: {
            status: sub.status.toUpperCase(),
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
          }
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

export default router
