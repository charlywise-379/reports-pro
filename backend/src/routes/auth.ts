import { Router, Request, Response } from 'express'
import { supabaseAdmin } from '../lib/supabaseAdmin'
import { sendConfirmationEmail } from '../lib/email'
import { prisma } from '../lib/prisma'
import { evaluatePartnerRegistration } from '../lib/partners'
import { enqueueMailchimpSync } from '../lib/lifecycleQueue'

const router = Router()

// Version del Aviso de Privacidad / Terminos y Condiciones vigente al momento del registro
const LEGAL_DOCS_VERSION = '2026-08-31'

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, password, phone, company, city, state, country, acceptedTerms, promoCode } = req.body

    if (typeof firstName !== 'string' || !firstName.trim()) {
      return res.status(400).json({ error: 'Nombre requerido' })
    }
    if (typeof lastName !== 'string' || !lastName.trim()) {
      return res.status(400).json({ error: 'Apellido requerido' })
    }
    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Email requerido' })
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
    }
    if (acceptedTerms !== true) {
      return res.status(400).json({ error: 'Debes aceptar el Aviso de Privacidad y los Términos y Condiciones' })
    }

    const normalizedEmailForPartner = email.trim().toLowerCase()
    const partner = evaluatePartnerRegistration(promoCode, normalizedEmailForPartner)
    if (partner.error) {
      return res.status(400).json({ error: partner.error })
    }

    let normalizedPromoCode: string | null = null
    if (!partner.isPartner && typeof promoCode === 'string' && promoCode.trim()) {
      const candidate = promoCode.trim().toUpperCase()
      const promo = await (prisma as any).promoCode.findUnique({ where: { code: candidate } })
      const valido = promo && promo.active &&
        (!promo.expiresAt || new Date(promo.expiresAt) > new Date()) &&
        promo.redemptionCount < promo.maxRedemptions
      if (!valido) {
        return res.status(400).json({ error: 'El código promocional no es válido o ya fue utilizado' })
      }
      normalizedPromoCode = candidate
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`
    const normalizedEmail = email.trim().toLowerCase()
    const existingRes = await fetch(
      `${process.env.SUPABASE_URL}/auth/v1/admin/users?filter=${encodeURIComponent(normalizedEmail)}`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    )
    const existingData = await existingRes.json() as { users?: { email?: string; email_confirmed_at?: string | null }[] }
    const existingUser = existingData?.users?.find(u => u.email?.toLowerCase() === normalizedEmail)

    if (existingUser && !existingUser.email_confirmed_at) {
      return res.status(409).json({ error: 'Ya iniciaste el registro con este correo. Revisa tu bandeja de entrada para confirmarlo.' })
    }

    const redirectTo = `${process.env.FRONTEND_URL}/login?confirmed=1`

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName },
        redirectTo,
      },
    })

    if (error) {
      if (error.code === 'email_exists' || error.code === 'user_already_exists') {
        return res.status(409).json({ error: 'Este email ya está registrado.' })
      }
      console.error('Error generando link de registro:', error)
      return res.status(500).json({ error: 'Ocurrió un error. Intenta de nuevo.' })
    }

    try {
      await prisma.user.create({
        data: {
          id: data.user.id,
          email: normalizedEmail,
          fullName,
          phone: typeof phone === 'string' && phone.trim() ? phone.trim() : null,
          company: typeof company === 'string' && company.trim() ? company.trim() : null,
          city: typeof city === 'string' && city.trim() ? city.trim() : null,
          state: typeof state === 'string' && state.trim() ? state.trim() : null,
          country: typeof country === 'string' && country.trim() ? country.trim() : null,
          pendingPromoCode: partner.isPartner ? null : normalizedPromoCode,
          accountType: partner.isPartner ? 'PARTNER' : 'STANDARD',
          partnerAgency: partner.agency,
          partnerCodeUsed: partner.code,
        },
      })
    } catch (userCreateError) {
      console.error('Error creando User en Prisma tras registro en Supabase:', userCreateError)
    }

    if (partner.isPartner) {
      try {
        await prisma.auditLog.create({
          data: {
            userId: data.user.id,
            event: 'partner_access_granted',
            metadata: { code: partner.code, agency: partner.agency, email: normalizedEmailForPartner },
          },
        })
      } catch (e) {
        console.error('Error registrando partner_access_granted:', e)
      }
    }

    if (!partner.isPartner) {
      await enqueueMailchimpSync(data.user.id, 'registered')
    }

    try {
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || null
      await prisma.auditLog.create({
        data: {
          userId: data.user.id,
          event: 'terms_privacy_accepted',
          metadata: { version: LEGAL_DOCS_VERSION, ip, context: 'register' },
        },
      })
    } catch (auditError) {
      console.error('Error registrando aceptación de términos:', auditError)
    }

    await sendConfirmationEmail(email.trim(), fullName, data.properties.action_link)

    return res.json({ ok: true })
  } catch (e: any) {
    console.error('Error en /api/auth/register:', e)
    return res.status(500).json({ error: 'Ocurrió un error. Intenta de nuevo.' })
  }
})

export default router
