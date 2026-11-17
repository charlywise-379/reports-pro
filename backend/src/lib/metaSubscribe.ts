import { prisma } from './prisma'
import { stripe } from './stripe'
import { sendMetaEvent, predictedLtv, isMetaCapiEnabled } from './metaCapi'

// Evento Subscribe del servidor: el PRIMER cobro con monto > 0 de cada suscripción de Stripe.
// - Cobro inmediato en el checkout (billing_reason subscription_create): event_id = subscribe_<checkout session>,
//   el mismo que manda el píxel en /checkout/success → Meta los deduplica.
// - Primer cobro al terminar la prueba (subscription_cycle): event_id = subscribe_<invoice>; solo lo ve el servidor.
// Un solo envío por suscripción, registrado en AuditLog (meta_subscribe_sent). Nunca lanza: el webhook sigue.

export const META_SUBSCRIBE_EVENT = 'meta_subscribe_sent'

export async function sendFirstPaymentSubscribe(invoice: any): Promise<void> {
  try {
    if (!isMetaCapiEnabled()) return
    const amountPaid = invoice?.amount_paid ?? 0
    // Según la apiVersion del webhook, la suscripción viene en invoice.subscription o en invoice.parent.subscription_details.
    const rawSub = invoice?.subscription ?? invoice?.parent?.subscription_details?.subscription
    const subId: string | undefined = typeof rawSub === 'string' ? rawSub : rawSub?.id
    if (amountPaid <= 0 || !subId) return

    const already = await prisma.auditLog.findFirst({
      where: { event: META_SUBSCRIBE_EVENT, metadata: { path: ['subscriptionId'], equals: subId } },
      select: { id: true },
    })
    if (already) return

    const local = await (prisma.subscription as any).findFirst({
      where: { stripeSubscriptionId: subId },
      select: { userId: true, projectId: true, user: { select: { email: true, accountType: true } } },
    })
    if (local?.user?.accountType === 'PARTNER') return

    // Solo el primer cobro: si la suscripción ya tenía otra factura pagada con monto, esto es una renovación
    // (p. ej. el token se configuró después del primer cobro) y no debe contarse como alta.
    const paid = await stripe.invoices.list({ subscription: subId, status: 'paid', limit: 5 })
    if (paid.data.some((i: any) => i.id !== invoice.id && (i.amount_paid ?? 0) > 0)) return

    const sub: any = await stripe.subscriptions.retrieve(subId)
    const meta = sub?.metadata || {}
    const interval = sub?.items?.data?.[0]?.price?.recurring?.interval
    const amount = Math.round(amountPaid) / 100
    const currency = String(invoice.currency || 'usd').toUpperCase()

    let eventId = `subscribe_${invoice.id}`
    if (invoice.billing_reason === 'subscription_create') {
      const sessions = await stripe.checkout.sessions.list({ subscription: subId, limit: 1 })
      if (sessions.data[0]?.id) eventId = `subscribe_${sessions.data[0].id}`
    }

    const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://omnireports.pro').split(',')[0].trim().replace(/\/$/, '')
    const ok = await sendMetaEvent({
      eventName: 'Subscribe',
      eventId,
      sourceUrl: `${FRONTEND_URL}/checkout/success`,
      email: local?.user?.email || invoice.customer_email || null,
      externalId: local?.userId || meta.userId || null,
      browser: { fbp: meta.meta_fbp, fbc: meta.meta_fbc, ip: meta.meta_ip, ua: meta.meta_ua },
      customData: { value: amount, currency, predicted_ltv: predictedLtv(amount, interval) },
    })
    if (ok) {
      await prisma.auditLog.create({
        data: {
          userId: local?.userId ?? meta.userId ?? null,
          projectId: local?.projectId ?? meta.projectId ?? null,
          event: META_SUBSCRIBE_EVENT,
          metadata: { subscriptionId: subId, invoiceId: invoice.id, eventId, value: amount, currency },
        },
      })
    }
  } catch (e: any) {
    console.error('[MetaCAPI] Subscribe del primer cobro falló:', e?.message || e)
  }
}
