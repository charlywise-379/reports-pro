import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params

    const project = await (prisma.project as any).findFirst({
      where: { userId },
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
      } : null,
      subscription: project.subscription || null,
      reports: project.reports || [],
    })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

export default router
