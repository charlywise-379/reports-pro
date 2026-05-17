import { Router, Request, Response } from 'express'
import path from 'path'
import { generateReport } from '../lib/reportEngine'
import { prisma } from '../lib/prisma'
import { DeliveryChannel, ReportFrequency, ServiceType, ProjectStatus, SubscriptionStatus } from '@prisma/client'

const router = Router()

router.post('/competitive', async (req: Request, res: Response) => {
  try {
    console.log('📦 PAYLOAD RECIBIDO:', JSON.stringify(req.body, null, 2))

    const {
      userId, companyName, brand, website, industry, companySize, ciudad, pais,
      targetMarket, mainProducts, socialMedia, pitch, differentiators,
      products, presenceScope, countries, directCompetitors, indirectCompetitors,
      monitorAreas, areaDepth, frequency, deliveryChannel, deliveryEmail, deliveryPhone,
      deliveryDay, deliveryTime, tags,
      presenceRegional, presenceNational, presenceInternational,
    } = req.body

    if (!userId) {
      return res.status(400).json({ error: 'No hay sesión activa' })
    }

    // ── Limpiar datos ──────────────────────────────────
    const finalName = (typeof companyName === 'string' && companyName.trim())
      ? companyName.trim()
      : (typeof brand === 'string' && brand.trim())
      ? brand.trim()
      : 'Sin nombre'

    // Competidores directos — solo los que tienen nombre
    const cleanDirect = Array.isArray(directCompetitors)
      ? directCompetitors
          .filter((c: any) => c && typeof c === 'object' && c.name && c.name.trim())
          .map((c: any) => ({
            name: c.name?.trim() || '',
            url: c.url?.trim() || '',
            products: c.products?.trim() || '',
            presence: c.presence || '',
            threat: Number(c.threat) || 5,
            ig: c.ig || '', fb: c.fb || '', x: c.x || '', li: c.li || '',
          }))
      : []

    // Competidores indirectos — solo los que tienen nombre
    const cleanIndirect = Array.isArray(indirectCompetitors)
      ? indirectCompetitors
          .filter((c: any) => c && typeof c === 'object' && c.name && c.name.trim())
          .map((c: any) => ({
            name: c.name?.trim() || '',
            industry: c.industry?.trim() || '',
            threat: Number(c.threat) || 5,
            relevance: Number(c.relevance) || 5,
          }))
      : []

    // Productos — solo los que tienen nombre
    const cleanProducts = Array.isArray(products)
      ? products
          .filter((p: any) => p && typeof p === 'object' && p.name && p.name.trim())
          .map((p: any) => ({
            name: p.name?.trim() || '',
            category: p.category?.trim() || '',
            priceFrom: p.priceFrom || '',
            priceTo: p.priceTo || '',
          }))
      : []

    // Diferenciadores — solo strings válidos
    const cleanDifferentiators = Array.isArray(differentiators)
      ? differentiators.filter((d: any) => typeof d === 'string' && d.trim())
      : []

    // Áreas de monitoreo
    const cleanMonitorAreas = Array.isArray(monitorAreas)
      ? monitorAreas.filter((a: any) => typeof a === 'string')
      : []

    // Canales de entrega
    const deliveryChannels: DeliveryChannel[] = []
    if (deliveryChannel === 'EMAIL' || deliveryChannel === 'BOTH') deliveryChannels.push(DeliveryChannel.EMAIL)
    if (deliveryChannel === 'WHATSAPP' || deliveryChannel === 'BOTH') deliveryChannels.push(DeliveryChannel.WHATSAPP)

    // Frecuencia
    const cleanFrequency = (['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'].includes(frequency))
      ? frequency as ReportFrequency
      : ReportFrequency.WEEKLY

    const prices: Record<string, number> = {
      DAILY: 29.99, WEEKLY: 25.00, BIWEEKLY: 22.00, MONTHLY: 20.00
    }

    const frequencyDays: Record<string, number> = {
      DAILY: 1, WEEKLY: 7, BIWEEKLY: 14, MONTHLY: 30
    }

    const trialStartedAt = new Date()
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 7)

    const nextReportAt = new Date()
    nextReportAt.setDate(nextReportAt.getDate() + (frequencyDays[cleanFrequency] || 7))

    // ── Upsert usuario ─────────────────────────────────
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

    // ── Upsert proyecto ─────────────────────────────────
    const existingProject = await (prisma.project as any).findFirst({
      where: { userId: user.id, serviceType: ServiceType.COMPETITIVE_INTELLIGENCE }
    })

    const projectData = {
      name: `${finalName} — Inteligencia Competitiva`,
      frequency: cleanFrequency,
      deliveryChannels,
      deliveryEmail: deliveryEmail || null,
      deliveryPhone: deliveryPhone || null,
      nextReportAt,
    }

    let newProject: any
    if (existingProject) {
      newProject = await (prisma.project as any).update({
        where: { id: existingProject.id },
        data: projectData
      })
    } else {
      newProject = await (prisma.project as any).create({
        data: {
          userId: user.id,
          serviceType: ServiceType.COMPETITIVE_INTELLIGENCE,
          status: ProjectStatus.TRIAL,
          trialStartedAt,
          trialEndsAt,
          ...projectData,
        }
      })
    }

    // ── Upsert setup ────────────────────────────────────
    const additionalContext = JSON.stringify({
      pitch,
      differentiators: cleanDifferentiators,
      products: cleanProducts,
      directCompetitors: cleanDirect,
      indirectCompetitors: cleanIndirect,
      areaDepth,
      countries,
      presenceScope,
      brand: typeof brand === 'string' ? brand.trim() : null,
      companySize: companySize || null,
      tags: Array.isArray(tags) ? tags : [],
      deliveryChannel: deliveryChannel || null,
      deliveryDay: deliveryDay || null,
      deliveryTime: deliveryTime || null,
      deliveryPhone: deliveryPhone || null,
    })

    const setupData = {
      companyName: finalName,
      website: website?.trim() || null,
      industry: industry || '',
      mainProducts: cleanProducts.map((p: any) => p.name),
      targetMarket: typeof targetMarket === 'string' ? targetMarket.trim() : null,
      city: typeof ciudad === 'string' ? ciudad.trim() : null,
      country: typeof pais === 'string' ? pais.trim() : 'México',
      competitor1Name: cleanDirect[0]?.name || null,
      competitor1Website: cleanDirect[0]?.url || null,
      competitor2Name: cleanDirect[1]?.name || null,
      competitor2Website: cleanDirect[1]?.url || null,
      competitor3Name: cleanDirect[2]?.name || null,
      competitor3Website: cleanDirect[2]?.url || null,
      competitor4Name: cleanDirect[3]?.name || null,
      competitor4Website: cleanDirect[3]?.url || null,
      competitor5Name: cleanDirect[4]?.name || null,
      competitor5Website: cleanDirect[4]?.url || null,
      linkedinUrl: socialMedia?.li || null,
      instagramUrl: socialMedia?.ig || null,
      facebookUrl: socialMedia?.fb || null,
      twitterUrl: socialMedia?.x || null,
      tiktokUrl: socialMedia?.tt || null,
      focusAreas: cleanMonitorAreas,
      geographicScope: Array.isArray(countries) ? countries : [],
      additionalContext,
    }

    await (prisma.competitiveIntelligenceSetup as any).upsert({
      where: { projectId: newProject.id },
      create: { projectId: newProject.id, ...setupData },
      update: setupData,
    })

    // ── Upsert suscripción ──────────────────────────────
    await (prisma.subscription as any).upsert({
      where: { projectId: newProject.id },
      create: {
        projectId: newProject.id,
        userId: user.id,
        status: SubscriptionStatus.TRIALING,
        frequency: cleanFrequency,
        pricePerMonth: prices[cleanFrequency] || 25.00,
        trialStartedAt,
        trialEndsAt,
      },
      update: {
        frequency: cleanFrequency,
        pricePerMonth: prices[cleanFrequency] || 25.00,
      }
    })

    // ── Generar primer reporte SOLO si es proyecto nuevo ──
    // Si ya existia proyecto, no generar reporte automatico
    if (existingProject) {
      return res.status(201).json({
        success: true,
        projectId: newProject.id,
        message: 'Configuracion actualizada correctamente',
        trialEndsAt,
      })
    }

    // Verificar limite trial: max 1 reporte gratis
    const reportCount = await prisma.report.count({
      where: { projectId: newProject.id, status: 'COMPLETED' as any }
    })
    if (reportCount >= 1 && newProject.status === 'TRIAL') {
      return res.status(201).json({
        success: true,
        projectId: newProject.id,
        message: 'trial_limit',
        trialEndsAt,
      })
    }

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

    // Crear registro en DB antes de generar para tener reportId
    const reportRecord = await prisma.report.create({
      data: {
        projectId: newProject.id,
        r2Key: `reports/${filename}`,
        status: 'GENERATING' as any,
      }
    })

    const projectWithSetupAndId = {
      ...projectWithSetup,
      reportId: reportRecord.id,
    }

    generateReport(projectWithSetupAndId, outputPath)
      .then(async () => {
        console.log(`✅ Primer reporte generado: ${filename}`)
        const { uploadPDFToR2 } = await import('../lib/r2')
        const pdfUrl = await uploadPDFToR2(outputPath, filename)
        console.log(`☁️ PDF disponible en: ${pdfUrl}`)

        await prisma.report.update({
          where: { id: reportRecord.id },
          data: {
            r2Url: pdfUrl,
            r2Key: `reports/${filename}`,
            status: 'COMPLETED' as any,
            pdfSizeBytes: require('fs').statSync(outputPath).size,
          }
        }).catch((e: any) => console.log('DB report update:', e.message))

        if (deliveryEmail) {
          const { sendReportEmail } = await import('../lib/email')
          const now = new Date()
          const weekNumber = Math.ceil(now.getDate() / 7) + (now.getMonth() * 4)
          await sendReportEmail(deliveryEmail, finalName, pdfUrl, weekNumber, 1)
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


// POST /api/onboarding/save — guardar progreso por paso
router.post('/save', async (req: Request, res: Response) => {
  try {
    const {
      userId, companyName, brand, website, industry, companySize, ciudad, pais,
      targetMarket, mainProducts, socialMedia, pitch, differentiators,
      products, presenceScope, countries, directCompetitors, indirectCompetitors,
      monitorAreas, areaDepth, frequency, deliveryEmail, deliveryPhone,
      deliveryChannel, deliveryDay, deliveryTime, tags,
    } = req.body

    if (!userId) return res.status(400).json({ error: 'No userId' })

    const existingProject = await (prisma.project as any).findFirst({
      where: { userId, serviceType: ServiceType.COMPETITIVE_INTELLIGENCE }
    })
    if (!existingProject) return res.status(404).json({ error: 'Proyecto no encontrado' })

    const finalName = (typeof companyName === 'string' && companyName.trim())
      ? companyName.trim()
      : (typeof brand === 'string' && brand.trim())
      ? brand.trim() : undefined

    const cleanDirect = Array.isArray(directCompetitors)
      ? directCompetitors.filter((c: any) => c?.name?.trim()).map((c: any) => ({
          name: c.name?.trim(), url: c.url?.trim() || '', products: c.products?.trim() || '',
          presence: c.presence || '', threat: Number(c.threat) || 5,
          ig: c.ig || '', fb: c.fb || '', x: c.x || '', li: c.li || '',
        })) : undefined

    const cleanIndirect = Array.isArray(indirectCompetitors)
      ? indirectCompetitors.filter((c: any) => c?.name?.trim()).map((c: any) => ({
          name: c.name?.trim(), industry: c.industry?.trim() || '',
          threat: Number(c.threat) || 5, relevance: Number(c.relevance) || 5,
        })) : undefined

    const cleanProducts = Array.isArray(products)
      ? products.filter((p: any) => p?.name?.trim()).map((p: any) => ({
          name: p.name?.trim(), category: p.category?.trim() || '',
          priceFrom: p.priceFrom || '', priceTo: p.priceTo || '',
        })) : undefined

    const existing = await (prisma.competitiveIntelligenceSetup as any).findUnique({
      where: { projectId: existingProject.id }
    })
    const existingCtx = existing?.additionalContext
      ? (typeof existing.additionalContext === 'string'
          ? JSON.parse(existing.additionalContext) : existing.additionalContext)
      : {}

    const newCtx = {
      ...existingCtx,
      ...(pitch !== undefined && { pitch }),
      ...(tags !== undefined && Array.isArray(tags) && tags.length > 0 && { tags }),
      ...(brand !== undefined && typeof brand === 'string' && brand.trim() !== '' && { brand }),
      ...(companySize !== undefined && typeof companySize === 'string' && companySize.trim() !== '' && { companySize }),
      ...(deliveryChannel !== undefined && deliveryChannel !== '' && { deliveryChannel }),
      ...(deliveryDay !== undefined && { deliveryDay }),
      ...(deliveryTime !== undefined && { deliveryTime }),
      ...(deliveryPhone !== undefined && deliveryPhone !== '' && { deliveryPhone }),
      ...(Array.isArray(differentiators) && { differentiators }),
      ...(cleanProducts && { products: cleanProducts }),
      ...(cleanDirect && { directCompetitors: cleanDirect }),
      ...(cleanIndirect && { indirectCompetitors: cleanIndirect }),
      ...(areaDepth !== undefined && { areaDepth }),
      ...(countries !== undefined && { countries }),
      ...(presenceScope !== undefined && { presenceScope }),
    }

    const setupUpdate: any = {
      additionalContext: JSON.stringify(newCtx),
      ...(finalName && { companyName: finalName }),
      ...(website !== undefined && { website: website?.trim() || null }),
      ...(industry !== undefined && { industry }),
      ...(ciudad !== undefined && { city: ciudad?.trim() || null }),
      ...(pais !== undefined && { country: pais }),
      ...(targetMarket !== undefined && { targetMarket }),
      ...(typeof mainProducts === 'string' && mainProducts && { mainProducts: mainProducts.split(',').map((s: string) => s.trim()).filter(Boolean) }),
      ...(Array.isArray(mainProducts) && { mainProducts }),
      ...(socialMedia?.li !== undefined && { linkedinUrl: socialMedia.li || null }),
      ...(socialMedia?.ig !== undefined && { instagramUrl: socialMedia.ig || null }),
      ...(socialMedia?.fb !== undefined && { facebookUrl: socialMedia.fb || null }),
      ...(socialMedia?.x !== undefined && { twitterUrl: socialMedia.x || null }),
      ...(socialMedia?.tt !== undefined && { tiktokUrl: socialMedia.tt || null }),
      ...(Array.isArray(monitorAreas) && { focusAreas: monitorAreas }),
      ...(cleanDirect && {
        competitor1Name: cleanDirect[0]?.name || null,
        competitor1Website: cleanDirect[0]?.url || null,
        competitor2Name: cleanDirect[1]?.name || null,
        competitor2Website: cleanDirect[1]?.url || null,
        competitor3Name: cleanDirect[2]?.name || null,
        competitor3Website: cleanDirect[2]?.url || null,
        competitor4Name: cleanDirect[3]?.name || null,
        competitor4Website: cleanDirect[3]?.url || null,
        competitor5Name: cleanDirect[4]?.name || null,
        competitor5Website: cleanDirect[4]?.url || null,
      }),
    }

    // Obtener nombre actual si no viene en el request
    const currentSetup = existing || await (prisma.competitiveIntelligenceSetup as any).findUnique({ where: { projectId: existingProject.id } })
    const safeCompanyName = setupUpdate.companyName || currentSetup?.companyName || existingProject.name?.replace(' — Inteligencia Competitiva', '') || 'Sin nombre'

    await (prisma.competitiveIntelligenceSetup as any).upsert({
      where: { projectId: existingProject.id },
      create: { projectId: existingProject.id, industry: '', companyName: safeCompanyName, ...setupUpdate },
      update: setupUpdate,
    })

    if (frequency || deliveryEmail || deliveryPhone || deliveryChannel) {
      const cleanFrequency = (['DAILY','WEEKLY','BIWEEKLY','MONTHLY'].includes(frequency))
        ? frequency as ReportFrequency : undefined
      await (prisma.project as any).update({
        where: { id: existingProject.id },
        data: {
          ...(cleanFrequency && { frequency: cleanFrequency }),
          ...(deliveryEmail && { deliveryEmail }),
          ...(deliveryPhone && { deliveryPhone }),
          ...(deliveryChannel && { deliveryChannels: deliveryChannel === 'BOTH' ? ['EMAIL','WHATSAPP'] : deliveryChannel === 'WHATSAPP' ? ['WHATSAPP'] : ['EMAIL'] }),
        }
      })
    }
    res.json({ success: true })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

export default router