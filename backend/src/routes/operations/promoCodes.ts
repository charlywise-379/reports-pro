import { Router, Request, Response } from 'express'
import { prisma } from '../../lib/prisma'
import { requireAdmin } from '../../middleware/requireAdmin'

const router = Router()

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function generateCode(length = 8): string {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return code
}

// GET /api/operations/promo-codes
router.get('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const codes = await (prisma as any).promoCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdByAdmin: { select: { fullName: true, email: true } },
        _count: { select: { redemptions: true } },
      },
    })
    res.json({
      codes: codes.map((c: any) => ({
        id: c.id,
        code: c.code,
        trialDays: c.trialDays,
        maxRedemptions: c.maxRedemptions,
        redemptionCount: c.redemptionCount,
        active: c.active,
        expiresAt: c.expiresAt,
        createdAt: c.createdAt,
        createdByAdminName: c.createdByAdmin?.fullName || c.createdByAdmin?.email || 'N/A',
      })),
    })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/operations/promo-codes
router.post('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { code, trialDays, maxRedemptions, expiresAt } = req.body

    const wasProvided = typeof code === 'string' && code.trim().length > 0
    let finalCode = wasProvided ? code.trim().toUpperCase() : generateCode()

    let created: any = null
    for (let attempt = 0; attempt < 3 && !created; attempt++) {
      try {
        created = await (prisma as any).promoCode.create({
          data: {
            code: finalCode,
            createdByAdminId: req.adminId!,
            trialDays: Number(trialDays) || 7,
            maxRedemptions: Number(maxRedemptions) || 1,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
          },
        })
      } catch (e: any) {
        if (e.code === 'P2002' && !wasProvided) {
          // Colision de codigo autogenerado — reintentar con uno nuevo
          finalCode = generateCode()
          continue
        }
        throw e
      }
    }

    if (!created) return res.status(409).json({ error: 'No se pudo generar un codigo unico, intenta de nuevo' })

    res.status(201).json({ success: true, code: created })
  } catch (e: any) {
    if (e.code === 'P2002') {
      return res.status(409).json({ error: 'Ese codigo ya existe' })
    }
    res.status(500).json({ error: e.message })
  }
})

// PATCH /api/operations/promo-codes/:id/toggle
router.patch('/:id/toggle', requireAdmin, async (req: Request, res: Response) => {
  try {
    const existing = await (prisma as any).promoCode.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Codigo no encontrado' })

    const updated = await (prisma as any).promoCode.update({
      where: { id: req.params.id },
      data: { active: !existing.active },
    })
    res.json({ success: true, active: updated.active })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

export default router
