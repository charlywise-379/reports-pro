import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { projectLimitInfo, projectLimitMessage } from '../lib/projectLimits'

const router = Router()

const VALID_SERVICE_TYPES = ['COMPETITIVE_INTELLIGENCE', 'CORPORATE_HEALTH', 'CYBERSECURITY_RADAR'] as const

// POST /api/projects — crea un proyecto borrador. Partners (sin tope) y usuarios con límite `maxProjects`
// mayor al número de empresas que ya tienen.
// Nota de diseño: el conteo y el alta no son atómicos; dos solicitudes simultáneas podrían exceder el tope
// por una ventana mínima, aceptado porque lo crea un usuario desde la interfaz y el límite es comercial, no de seguridad.
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, accountType: true, maxProjects: true },
    })
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })

    const projectCount = await prisma.project.count({ where: { userId } })
    const limit = projectLimitInfo({ accountType: user.accountType, maxProjects: user.maxProjects, projectCount })
    if (!limit.canCreate) {
      return res.status(403).json({ error: projectLimitMessage(limit.max!), code: 'project_limit_reached' })
    }

    const serviceType = VALID_SERVICE_TYPES.includes(req.body?.serviceType)
      ? req.body.serviceType
      : 'COMPETITIVE_INTELLIGENCE'

    const now = new Date()
    const isPartner = user.accountType === 'PARTNER'
    // Partners: acceso total sin cobro (ACTIVE). Resto: empresa en prueba de 7 días, para que el scheduler
    // no la trate como pagada; su reporte gratis lo controla Project.freeReportUsedAt.
    const trialEndsAt = isPartner ? now : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const project = await (prisma.project as any).create({
      data: {
        userId,
        name: 'Proyecto nuevo',
        serviceType,
        frequency: 'MONTHLY',
        status: isPartner ? 'ACTIVE' : 'TRIAL',
        trialStartedAt: now,
        trialEndsAt,
      },
    })

    return res.status(201).json({ projectId: project.id })
  } catch (e: any) {
    console.error('Error en POST /api/projects:', e)
    return res.status(500).json({ error: 'Error interno' })
  }
})

export default router
