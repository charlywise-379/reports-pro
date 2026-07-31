import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import { prisma } from '../../lib/prisma'
import { signAdminToken } from '../../lib/adminAuth'
import { requireAdmin } from '../../middleware/requireAdmin'
import { z } from 'zod'

const router = Router()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const COOKIE_OPTIONS = {
  httpOnly: true as const,
  secure: true as const,
  sameSite: 'strict' as const,
  maxAge: 12 * 60 * 60 * 1000,
  path: '/',
}

router.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' })
    }
    const { email, password } = parsed.data

    const admin = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (!admin) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    const validPassword = await bcrypt.compare(password, admin.passwordHash)
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    const token = signAdminToken({ adminId: admin.id, role: admin.role })
    res.cookie('admin_session', token, COOKIE_OPTIONS)

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        event: 'admin_login',
        metadata: { ip: req.ip, email: admin.email },
      },
    })

    res.json({ ok: true, admin: { id: admin.id, email: admin.email, fullName: admin.fullName, role: admin.role } })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/logout', requireAdmin, async (req: Request, res: Response) => {
  res.clearCookie('admin_session', { path: '/' })
  res.json({ ok: true })
})

router.get('/me', requireAdmin, async (req: Request, res: Response) => {
  const admin = await prisma.adminUser.findUnique({ where: { id: req.adminId! } })
  if (!admin) return res.status(404).json({ error: 'Administrador no encontrado' })
  res.json({ id: admin.id, email: admin.email, fullName: admin.fullName, role: admin.role })
})

export default router
