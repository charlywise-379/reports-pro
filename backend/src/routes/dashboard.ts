import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.get('/:userId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params

    if (userId !== req.userId) {
      return res.status(403).json({ error: 'No tienes permiso para ver este dashboard' })
    }

    const project = await (prisma.project as any).findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        competitiveSetup: true,
        subscription: true,
        reports: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            createdAt: true,
            r2Key: true,
            r2Url: true,
            pdfSizeBytes: true,
            status: true,
            reportTitle: true,
            sectionsJson: true,
          }
        }
      }
    })

    if (!project) return res.json({ project: null })

    res.json({
      project: {
        id: project.id,
        name: project.name,
        serviceType: project.serviceType,
        frequency: project.frequency,
        status: project.status,
        trialEndsAt: project.trialEndsAt,
        nextReportAt: project.nextReportAt,
        deliveryChannels: project.deliveryChannels,
        deliveryEmail: project.deliveryEmail,
      },
      setup: project.competitiveSetup ? {
        companyName: project.competitiveSetup.companyName,
        website: project.competitiveSetup.website,
        industry: project.competitiveSetup.industry,
        city: project.competitiveSetup.city,
        country: project.competitiveSetup.country,
        competitor1Name: project.competitiveSetup.competitor1Name,
        competitor2Name: project.competitiveSetup.competitor2Name,
        competitor3Name: project.competitiveSetup.competitor3Name,
        competitor4Name: project.competitiveSetup.competitor4Name,
        competitor5Name: project.competitiveSetup.competitor5Name,
        focusAreas: project.competitiveSetup.focusAreas,
        linkedinUrl: project.competitiveSetup.linkedinUrl,
        instagramUrl: project.competitiveSetup.instagramUrl,
        facebookUrl: project.competitiveSetup.facebookUrl,
        twitterUrl: project.competitiveSetup.twitterUrl,
        tiktokUrl: project.competitiveSetup.tiktokUrl,
        targetMarket: project.competitiveSetup.targetMarket,
        mainProducts: project.competitiveSetup.mainProducts,
        additionalContext: project.competitiveSetup.additionalContext,
      } : null,
      subscription: project.subscription || null,
      reports: project.reports || [],
    })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

export default router
