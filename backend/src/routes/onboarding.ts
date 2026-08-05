import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { DeliveryChannel, ReportFrequency, ServiceType, ProjectStatus, SubscriptionStatus } from '@prisma/client'
import { autocompleteCompanyInfo, isPrivateOrLoopbackHost } from '../lib/onboardingAutocomplete'

const router = Router()

router.post('/competitive', requireAuth, async (req: Request, res: Response) => {
  try {
    const {
      companyName, brand, website, industry, companySize, ciudad, pais,
      targetMarket, mainProducts, socialMedia, pitch, differentiators,
      products, presenceScope, countries, directCompetitors, indirectCompetitors,
      monitorAreas, areaDepth, frequency, deliveryChannel, deliveryEmail, deliveryPhone,
      deliveryDay, deliveryTime, tags,
      presenceRegional, presenceNational, presenceInternational,
    } = req.body

    // userId siempre viene del token JWT — nunca del body
    const userId = req.userId!

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
            ig: c.ig || '', fb: c.fb || '', x: c.x || '', li: c.li || '', tt: c.tt || '',
          }))
      : []

    // Competidores indirectos — solo los que tienen nombre
    const cleanIndirect = Array.isArray(indirectCompetitors)
      ? indirectCompetitors
          .filter((c: any) => c && typeof c === 'object' && c.name && c.name.trim())
          .map((c: any) => ({
            name: c.name?.trim() || '',
            industry: c.industry?.trim() || '',
            url: c.url?.trim() || '',
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
      ...(deliveryEmail && { deliveryEmail }),
      ...(deliveryPhone && { deliveryPhone }),
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
      ...(deliveryPhone && { deliveryPhone }),
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


    // ── BUG #2 FIX: NO generar reporte aquí ────────────────
    // El primer reporte lo genera el usuario manualmente desde el dashboard
    // DESPUÉS de que Stripe confirme el pago vía webhook.
    // Flujo correcto: onboarding → checkout → webhook → dashboard → generar manual
    res.status(201).json({
      success: true,
      projectId: newProject.id,
      message: 'Módulo activado correctamente',
      trialEndsAt,
    })

  } catch (error: any) {
    console.error('Error en onboarding:', error)
    res.status(500).json({ error: 'Error interno', detail: error.message })
  }
})


// POST /api/onboarding/save — guardar progreso por paso
router.post('/save', requireAuth, async (req: Request, res: Response) => {
  try {
    const {
      companyName, brand, website, industry, companySize, ciudad, pais,
      targetMarket, mainProducts, socialMedia, pitch, differentiators,
      products, presenceScope, countries, directCompetitors, indirectCompetitors,
      monitorAreas, areaDepth, frequency, deliveryEmail, deliveryPhone,
      deliveryChannel, deliveryDay, deliveryTime, tags,
    } = req.body

    // userId siempre viene del token JWT — nunca del body
    const userId = req.userId!

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
          ig: c.ig || '', fb: c.fb || '', x: c.x || '', li: c.li || '', tt: c.tt || '',
        })) : undefined

    const cleanIndirect = Array.isArray(indirectCompetitors)
      ? indirectCompetitors.filter((c: any) => c?.name?.trim()).map((c: any) => ({
          name: c.name?.trim(), industry: c.industry?.trim() || '', url: c.url?.trim() || '',
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
// POST /api/onboarding/invite — guardar emails de colegas y enviar bienvenida
router.post('/invite', requireAuth, async (req: Request, res: Response) => {
  try {
    const { projectId, emails } = req.body
    const userId = req.userId!

    if (!projectId || !emails?.length) {
      return res.status(400).json({ error: 'projectId y emails requeridos' })
    }

    const project = await (prisma.project as any).findUnique({ where: { id: projectId } })
    if (!project || project.userId !== userId) {
      return res.status(403).json({ error: 'No tienes permiso' })
    }

    // Guardar emails adicionales en el setup
    const setup = await (prisma.competitiveIntelligenceSetup as any).findUnique({ where: { projectId } })
    const existingCtx = setup?.additionalContext
      ? (typeof setup.additionalContext === 'string' ? JSON.parse(setup.additionalContext) : setup.additionalContext)
      : {}

    const currentCCs = existingCtx.ccEmails || []
    const newCCs = [...new Set([...currentCCs, ...emails])]

    await (prisma.competitiveIntelligenceSetup as any).update({
      where: { projectId },
      data: { additionalContext: JSON.stringify({ ...existingCtx, ccEmails: newCCs }) }
    })

    // Enviar email de bienvenida a cada colega
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    const companyName = setup?.companyName || 'tu empresa'

    for (const email of emails) {
      await resend.emails.send({
        from: 'Reports PRO <reportes@flow11.mx>',
        to: email,
        subject: `Te han invitado a recibir reportes de inteligencia de ${companyName}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0D0F1A;color:#F0F2FF;padding:40px;border-radius:16px">
            <div style="text-align:center;margin-bottom:32px">
              <div style="font-size:24px;font-weight:900">Reports<span style="color:#8B7BFF"> PRO</span></div>
              <div style="font-size:11px;color:#5A627A;letter-spacing:0.15em;text-transform:uppercase;margin-top:4px">AI Automated Intelligence</div>
            </div>
            <h2 style="font-size:20px;font-weight:800;margin-bottom:12px">Fuiste invitado a recibir reportes de inteligencia</h2>
            <p style="color:#9CA3AF;line-height:1.6;margin-bottom:24px">
              A partir de ahora recibirás automáticamente los reportes de <strong style="color:#F0F2FF">${companyName}</strong> generados por Reports PRO AI — análisis competitivo, alertas del sector y tendencias de mercado.
            </p>
            <div style="background:rgba(139,123,255,0.1);border:1px solid rgba(139,123,255,0.2);border-radius:12px;padding:24px;margin-bottom:24px">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#8B7BFF;margin-bottom:8px">Inteligencia Automatizada AI</div>
              <div style="font-size:16px;font-weight:800;color:#F0F2FF;margin-bottom:6px">Genera tus propios reportes PRO de AI Automation</div>
              <div style="font-size:13px;color:#9CA3AF;margin-bottom:20px">Conoce los servicios de inteligencia automatizada IA.</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px">
                <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px">
                  <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;color:#5DD4D4;text-transform:uppercase;margin-bottom:4px">01 · Competitivo</div>
                  <div style="font-size:12px;color:#F0F2FF;font-weight:600">Inteligencia Competitiva</div>
                  <div style="font-size:11px;color:#5A627A;margin-top:2px">Movimientos, precios y alertas del sector</div>
                </div>
                <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px">
                  <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;color:#8B7BFF;text-transform:uppercase;margin-bottom:4px">02 · Seguridad</div>
                  <div style="font-size:12px;color:#F0F2FF;font-weight:600">Radar Ciberseguridad</div>
                  <div style="font-size:11px;color:#5A627A;margin-top:2px">Vulnerabilidades, brechas y protección</div>
                </div>
                <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px">
                  <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;color:#6EE7A4;text-transform:uppercase;margin-bottom:4px">03 · Bienestar</div>
                  <div style="font-size:12px;color:#F0F2FF;font-weight:600">Salud Corporativa RRHH</div>
                  <div style="font-size:11px;color:#5A627A;margin-top:2px">Burnout, rotación y bienestar laboral</div>
                </div>
                <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px">
                  <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;color:#F2C063;text-transform:uppercase;margin-bottom:4px">04 · Ejecutivo</div>
                  <div style="font-size:12px;color:#F0F2FF;font-weight:600">Perfil Clave Ejecutivo</div>
                  <div style="font-size:11px;color:#5A627A;margin-top:2px">Liderazgo, red de contactos e influencia</div>
                </div>
              </div>
              <a href="https://reports-pro.vercel.app/register" style="display:inline-block;background:linear-gradient(135deg,#8B7BFF,#5DD4D4);color:#0D0F1A;font-weight:800;padding:12px 28px;border-radius:20px;text-decoration:none;font-size:13px">Crear mi cuenta gratis →</a>
            </div>
          </div>
        `
      }).catch((e: any) => console.error('Error enviando invite a', email, e.message))
    }

    res.json({ success: true, invited: emails.length })
  } catch(e: any) {
    res.status(500).json({ error: e.message })
  }
})

const URL_REACHABILITY_TIMEOUT_MS = 3000

async function isUrlReachable(sitioWeb: string): Promise<boolean> {
  const url = /^https?:\/\//i.test(sitioWeb) ? sitioWeb : `https://${sitioWeb}`
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false
  if (isPrivateOrLoopbackHost(parsed.hostname)) return false

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), URL_REACHABILITY_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OmniReportsBot/1.0)' },
    })
    if (res.status >= 500) return false
    return true
  } catch {
    try {
      const res = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OmniReportsBot/1.0)' },
      })
      return res.status < 500
    } catch {
      return true
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

// POST /api/onboarding/autocomplete — autocompletar campos con IA (redes sociales, industria, etc.)
router.post('/autocomplete', requireAuth, async (req: Request, res: Response) => {
  try {
    const { nombre, sitioWeb, tipo } = req.body

    if (typeof nombre !== 'string' || !nombre.trim() || typeof sitioWeb !== 'string' || !sitioWeb.trim()) {
      return res.status(400).json({ success: false, error: 'nombre y sitioWeb son requeridos' })
    }
    if (tipo !== 'company' && tipo !== 'competitor') {
      return res.status(400).json({ success: false, error: 'tipo debe ser "company" o "competitor"' })
    }

    const reachable = await isUrlReachable(sitioWeb.trim())
    if (!reachable) {
      return res.status(200).json({ success: false, error: 'No pudimos acceder a esa URL — verifica que esté bien escrita y el sitio esté disponible.' })
    }

    const data = await autocompleteCompanyInfo(nombre.trim(), sitioWeb.trim(), tipo)
    res.status(200).json({ success: true, data })
  } catch (e: any) {
    console.error('Error en autocompletado:', e.message)
    res.status(502).json({ success: false, error: e.message || 'No se pudo completar el autocompletado' })
  }
})
