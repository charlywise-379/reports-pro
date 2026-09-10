import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()

const VALID_SERVICE_TYPES = ['COMPETITIVE_INTELLIGENCE', 'CORPORATE_HEALTH', 'CYBERSECURITY_RADAR'] as const

// POST /api/projects — crea un proyecto borrador. Solo cuentas partner:
// las cuentas STANDARD tienen un único proyecto gestionado por el onboarding.
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })
    if ((user as any).accountType !== 'PARTNER') {
      return res.status(403).json({ error: 'Solo las cuentas asociadas pueden crear proyectos adicionales' })
    }

    const serviceType = VALID_SERVICE_TYPES.includes(req.body?.serviceType)
      ? req.body.serviceType
      : 'COMPETITIVE_INTELLIGENCE'

    const now = new Date()
    const project = await (prisma.project as any).create({
      data: {
        userId,
        name: 'Proyecto nuevo',
        serviceType,
        frequency: 'MONTHLY',
        status: 'ACTIVE',
        trialStartedAt: now,
        trialEndsAt: now,
      },
    })

    return res.status(201).json({ projectId: project.id })
  } catch (e: any) {
    console.error('Error en POST /api/projects:', e)
    return res.status(500).json({ error: 'Error interno' })
  }
})

export default router
