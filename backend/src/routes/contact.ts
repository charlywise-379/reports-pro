import { Router, Request, Response } from 'express'
import { sendContactFormEmail } from '../lib/email'

const router = Router()

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, message } = req.body

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Nombre requerido' })
    }
    if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ error: 'Email inválido' })
    }
    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Mensaje requerido' })
    }
    if (name.length > 200 || email.length > 200 || message.length > 5000) {
      return res.status(400).json({ error: 'Uno de los campos excede el largo permitido' })
    }

    await sendContactFormEmail(name.trim(), email.trim(), message.trim())

    return res.json({ ok: true })
  } catch (e: any) {
    console.error('Error en /api/contact:', e)
    return res.status(500).json({ error: 'Ocurrió un error. Intenta de nuevo.' })
  }
})

export default router
