import { Router, Request, Response } from 'express'
import { supabaseAdmin } from '../lib/supabaseAdmin'
import { sendConfirmationEmail } from '../lib/email'

const router = Router()

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { fullName, email, password } = req.body

    if (typeof fullName !== 'string' || !fullName.trim()) {
      return res.status(400).json({ error: 'Nombre completo requerido' })
    }
    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Email requerido' })
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
    }

    const redirectTo = `${process.env.FRONTEND_URL}/login?confirmed=1`

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
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

    await sendConfirmationEmail(email.trim(), fullName.trim(), data.properties.action_link)

    return res.json({ ok: true })
  } catch (e: any) {
    console.error('Error en /api/auth/register:', e)
    return res.status(500).json({ error: 'Ocurrió un error. Intenta de nuevo.' })
  }
})

export default router
