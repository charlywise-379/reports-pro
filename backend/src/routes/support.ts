import { Router, Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { sendSupportEmail } from '../lib/email'
import { SUPPORT_SYSTEM_PROMPT } from '../lib/supportPrompt'

const router = Router()
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

type ChatTurn = { role: 'user' | 'assistant'; content: string }

// requireAuth debe correr ANTES que los rate limiters de este router porque
// ambos limiters usan req.userId (no la IP) como key — por eso, a diferencia
// de los limiters globales en index.ts (que se montan antes del router),
// aqui van como middleware del propio router, en este orden.
router.use(requireAuth)

const chatLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  keyGenerator: (req: Request) => req.userId!,
  message: { error: 'Alcanzaste el límite de mensajes por hora. Intenta más tarde o contacta a un humano.' },
  standardHeaders: true,
  legacyHeaders: false,
})

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req: Request) => req.userId!,
  message: { error: 'Demasiados mensajes enviados. Intenta en un rato.' },
  standardHeaders: true,
  legacyHeaders: false,
})

router.post('/chat', chatLimiter, async (req: Request, res: Response) => {
  try {
    const { messages } = req.body

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages requerido' })
    }
    const last = messages[messages.length - 1]
    if (!last || last.role !== 'user') {
      return res.status(400).json({ error: 'El último mensaje debe ser del usuario' })
    }

    const trimmed: ChatTurn[] = messages
      .slice(-12)
      .filter((m: any) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .map((m: any) => ({ role: m.role, content: m.content.slice(0, 2000) }))

    if (trimmed.length === 0) {
      return res.status(400).json({ error: 'messages inválido' })
    }

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SUPPORT_SYSTEM_PROMPT,
      messages: trimmed,
    })

    const reply = response.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n')
      .trim()

    return res.json({ reply: reply || 'No pude generar una respuesta. Intenta de nuevo o contacta a un humano.' })
  } catch (e: any) {
    console.error('Error en /api/support/chat:', e)
    return res.status(500).json({ error: 'Ocurrió un error. Intenta de nuevo.' })
  }
})

router.post('/contact-human', contactLimiter, async (req: Request, res: Response) => {
  try {
    const { subject, message, chatContext } = req.body

    if (typeof subject !== 'string' || !subject.trim()) {
      return res.status(400).json({ error: 'Asunto requerido' })
    }
    if (subject.length > 200) {
      return res.status(400).json({ error: 'El asunto excede el largo permitido' })
    }
    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Mensaje requerido' })
    }
    if (message.length > 5000) {
      return res.status(400).json({ error: 'El mensaje excede el largo permitido' })
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId! } })
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    const context: ChatTurn[] = Array.isArray(chatContext)
      ? chatContext
          .slice(-6)
          .filter((m: any) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      : []

    await sendSupportEmail(user.fullName || user.email, user.email, subject.trim(), message.trim(), context)

    return res.json({ ok: true })
  } catch (e: any) {
    console.error('Error en /api/support/contact-human:', e)
    return res.status(500).json({ error: 'Ocurrió un error. Intenta de nuevo.' })
  }
})

export default router
