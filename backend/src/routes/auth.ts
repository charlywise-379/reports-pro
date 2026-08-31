import { Router, Request, Response } from 'express'
import { supabaseAdmin } from '../lib/supabaseAdmin'
import { sendConfirmationEmail } from '../lib/email'
import { prisma } from '../lib/prisma'

const router = Router()

// Version del Aviso de Privacidad / Terminos y Condiciones vigente al momento del registro
const LEGAL_DOCS_VERSION = '2026-08-31'

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, password, phone, company, city, state, country, acceptedTerms } = req.body

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
        },
      })
    } catch (userCreateError) {
      console.error('Error creando User en Prisma tras registro en Supabase:', userCreateError)
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
