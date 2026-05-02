import { Router, Request, Response } from 'express'
import path from 'path'
import { generateReport } from '../lib/reportEngine'
import { prisma } from '../lib/prisma'
import { DeliveryChannel, ReportFrequency, ServiceType, ProjectStatus, SubscriptionStatus } from '@prisma/client'

const router = Router()

router.post('/competitive', async (req: Request, res: Response) => {
  try {
    const {
      userId, companyName, brand, website, industry, companySize,
      targetMarket, mainProducts, socialMedia, industriesOfInterest,
      valueProposition, products, presenceRegional, presenceNational,
      presenceInternational, directCompetitors, indirectCompetitors,
      monitorAreas, frequency, deliveryChannel, deliveryEmail, deliveryPhone,
    } = req.body

    const finalName = companyName || brand || 'Sin nombre'

if (!userId) {
  return res.status(400).json({ error: 'No hay sesión activa' })
}

    let user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          email: deliveryEmail || `user-${userId}@reportspro.com`,
          phone: deliveryPhone || null,
        }
      })
    }

    const trialStartedAt = new Date()
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 7)

    const nextReportAt = new Date()
    const frequencyDays: Record<string, number> = {
      DAILY: 1, WEEKLY: 7, BIWEEKLY: 14, MONTHLY: 30
    }
    nextReportAt.setDate(nextReportAt.getDate() + (frequencyDays[frequency] || 7))

    const prices: Record<string, number> = {
      DAILY: 29.99, WEEKLY: 25.00, BIWEEKLY: 22.00, MONTHLY: 20.00
    }

    const deliveryChannels: DeliveryChannel[] = []
    if (deliveryChannel === 'EMAIL' || deliveryChannel === 'BOTH') deliveryChannels.push(DeliveryChannel.EMAIL)
    if (deliveryChannel === 'WHATSAPP' || deliveryChannel === 'BOTH') deliveryChannels.push(DeliveryChannel.WHATSAPP)

    const additionalContext = JSON.stringify({
      companySize, targetMarket, valueProposition,
      products: products?.filter((p: any) => p.name),
      presence: { regional: presenceRegional, national: presenceNational, international: presenceInternational },
      directCompetitors: directCompetitors?.filter((c: any) => c.name),
      indirectCompetitors: indirectCompetitors?.filter((c: any) => c.name),
      industriesOfInterest, socialMedia,
    })

    const newProject = await prisma.project.create({
      data: {
        userId: user.id,
        name: `${finalName} — Inteligencia Competitiva`,
        serviceType: ServiceType.COMPETITIVE_INTELLIGENCE,
        frequency: frequency as ReportFrequency,
        status: ProjectStatus.TRIAL,
        deliveryChannels,
        deliveryEmail: deliveryEmail || null,
        deliveryPhone: deliveryPhone || null,
        trialStartedAt,
        trialEndsAt,
        nextReportAt,
      }
    })

    await prisma.competitiveIntelligenceSetup.create({
      data: {
        projectId: newProject.id,
        companyName: finalName,
        website: website || null,
        industry: industry || '',
        mainProducts: mainProducts ? [mainProducts] : [],
        targetMarket: targetMarket || null,
        linkedinUrl: socialMedia?.li || null,
        instagramUrl: socialMedia?.ig || null,
        facebookUrl: socialMedia?.fb || null,
        twitterUrl: socialMedia?.x || null,
        tiktokUrl: socialMedia?.tt || null,
        focusAreas: monitorAreas || [],
        geographicScope: [
          ...(presenceRegional ? ['REGIONAL'] : []),
          ...(presenceNational ? ['NATIONAL'] : []),
          ...(presenceInternational ? ['INTERNATIONAL'] : []),
        ],
        additionalContext,
      }
    })

    await prisma.subscription.create({
      data: {
        projectId: newProject.id,
        userId: user.id,
        status: SubscriptionStatus.TRIALING,
        frequency: frequency as ReportFrequency,
        pricePerMonth: prices[frequency] || 25.00,
        trialStartedAt,
        trialEndsAt,
      }
    })

    // Generar primer reporte en background (no bloquea la respuesta)
    const outputDir = path.join(__dirname, '../../outputs')
    if (!require('fs').existsSync(outputDir)) {
      require('fs').mkdirSync(outputDir, { recursive: true })
    }
    const filename = `report-${newProject.id}-${Date.now()}.pdf`
    const outputPath = path.join(outputDir, filename)

    const projectWithSetup = {
      ...newProject,
      setup: await prisma.competitiveIntelligenceSetup.findUnique({
        where: { projectId: newProject.id }
      })
    }

    // Lanzar generación en background
    generateReport(projectWithSetup, outputPath)
      .then(async () => {
        console.log(`✅ Primer reporte generado: ${filename}`)
        // Subir a R2
        const { uploadPDFToR2 } = await import('../lib/r2')
        const pdfUrl = await uploadPDFToR2(outputPath, filename)
        console.log(`☁️ PDF disponible en: ${pdfUrl}`)

        // Guardar URL en DB
        await prisma.report.create({
          data: {
            projectId: newProject.id,
            r2Url: pdfUrl,
            r2Key: `reports/${filename}`,
            status: 'COMPLETED',
          }
        }).catch((e: any) => console.log('DB report save:', e.message))

        // Enviar email si hay email configurado
        if (deliveryEmail) {
          const { sendReportEmail } = await import('../lib/email')
          const now = new Date()
          const weekNumber = Math.ceil(now.getDate() / 7) + (now.getMonth() * 4)
          await sendReportEmail(
            deliveryEmail,
            finalName,
            pdfUrl,
            weekNumber,
            1
          )
        }
      })
      .catch((err: any) => console.error('❌ Error generando reporte inicial:', err.message))

    res.status(201).json({
      success: true,
      projectId: newProject.id,
      message: 'Módulo activado correctamente',
      trialEndsAt,
      firstReportIn: '~6 minutos',
    })

  } catch (error: any) {
    console.error('Error en onboarding:', error)
    res.status(500).json({ error: 'Error interno', detail: error.message })
  }
})

export default router