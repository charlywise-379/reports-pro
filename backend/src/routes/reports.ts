import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { generateReport } from '../lib/reportEngine'
import { uploadPDFToR2 } from '../lib/r2'
import { requireAuth } from '../middleware/auth'
import path from 'path'
import fs from 'fs'

const router = Router()

router.post('/generate/:projectId', requireAuth, async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string
  const userId = req.userId!
  try {
    console.log('Iniciando generacion reporte: ' + projectId)
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { competitiveSetup: true },
    })
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' })
    if ((project as any).userId !== userId) return res.status(403).json({ error: 'No tienes permiso para generar este reporte' })

    // 🔒 RESTRICCION TRIAL: max 1 reporte gratis
    // Solo aplica si NO tiene suscripcion Stripe activa
    if ((project as any).status === 'TRIAL') {
      const sub = await (prisma.subscription as any).findFirst({ where: { projectId } })
      const tieneStripe = sub?.stripeSubscriptionId != null &&
        ['active', 'trialing'].includes((sub?.status || '').toLowerCase())
      if (!tieneStripe) {
        const reportCount = await prisma.report.count({
          where: { projectId, status: 'COMPLETED' as any }
        })
        if (reportCount >= 1) {
          return res.status(403).json({ error: 'trial_limit', message: 'Has usado tu reporte gratuito. Activa tu plan para continuar.' })
        }
      }
    }

    // 🔒 RESTRICCION POR FRECUENCIA
    const lastReport = await prisma.report.findFirst({
      where: { projectId, status: 'COMPLETED' as any },
      orderBy: { createdAt: 'desc' }
    })
    if (lastReport && (project as any).status !== 'TRIAL') {
      const frecuencyHours: Record<string, number> = {
        DAILY: 24, WEEKLY: 168, BIWEEKLY: 336, MONTHLY: 720
      }
      const freq = (project as any).frequency || 'WEEKLY'
      const horasMinimas = frecuencyHours[freq] || 168
      const horasTranscurridas = (Date.now() - new Date(lastReport.createdAt).getTime()) / (1000 * 60 * 60)
      if (horasTranscurridas < horasMinimas) {
        const horasRestantes = Math.ceil(horasMinimas - horasTranscurridas)
        return res.status(429).json({ error: 'frequency_limit', message: 'Tu plan ' + freq + ' permite un reporte cada ' + horasMinimas + 'h. Faltan ' + horasRestantes + 'h para tu proximo reporte.' })
      }
    }
    // 🔒 ANTI-DUPLICADO: verificar que no haya un reporte ya generándose
    const hayGenerando = await prisma.report.findFirst({
      where: { projectId, status: 'GENERATING' as any }
    })
    if (hayGenerando) {
      return res.status(429).json({ error: 'generating', message: 'Ya hay un reporte generándose. Espera a que termine.' })
    }

    const outputDir = path.join(__dirname, '../../outputs')
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })
    const filename = 'report-' + projectId + '-' + Date.now() + '.pdf'
    const outputPath = path.join(outputDir, filename)
    const reportRecord = await prisma.report.create({
      data: { projectId, status: 'GENERATING' as any, r2Key: 'reports/' + filename }
    })
    const projectWithSetup = { ...project, setup: (project as any).competitiveSetup, reportId: reportRecord.id }
    await generateReport(projectWithSetup, outputPath)
    const signedUrl = await uploadPDFToR2(outputPath, filename)
    await prisma.report.update({
      where: { id: reportRecord.id },
      data: { status: 'COMPLETED' as any, pdfSizeBytes: fs.statSync(outputPath).size, r2Key: 'reports/' + filename, r2Url: signedUrl }
    })
    if (!fs.existsSync(outputPath)) throw new Error('El PDF no se genero correctamente')
    const fileSize = fs.statSync(outputPath).size
    try {
      const setup = (project as any).competitiveSetup
      const companyName = setup?.companyName || 'Tu empresa'
      const now = new Date()
      const weekNumber = Math.ceil((now.getDate() + new Date(now.getFullYear(), now.getMonth(), 1).getDay()) / 7)
      const reportCount = await prisma.report.count({ where: { projectId, status: 'COMPLETED' as any } })

      if (project.deliveryEmail) {
        const { sendReportEmail } = await import('../lib/email')
        // Obtener CC emails de colegas invitados
        const setupForCC = (project as any).competitiveSetup
        let ccEmails: string[] = []
        try {
          const ctx = setupForCC?.additionalContext
            ? (typeof setupForCC.additionalContext === 'string' ? JSON.parse(setupForCC.additionalContext) : setupForCC.additionalContext)
            : {}
          ccEmails = ctx.ccEmails || []
        } catch(e) {}
        await sendReportEmail(project.deliveryEmail, companyName, signedUrl, weekNumber, reportCount, ccEmails)
      }

      const deliveryPhone = (project as any).deliveryPhone
      const deliveryChannels = (project as any).deliveryChannels || []
      if (deliveryPhone && deliveryChannels.includes('WHATSAPP')) {
        const { sendReportWhatsApp } = await import('../lib/whatsapp')
        await sendReportWhatsApp(deliveryPhone, companyName, signedUrl, reportCount)
        console.log('[WhatsApp] Reporte enviado a ' + deliveryPhone)
      }
    } catch(emailErr: any) { console.error('Error enviando notificaciones:', emailErr.message) }
    res.status(200).json({ success: true, message: 'Reporte generado correctamente', filename, fileSize: Math.round(fileSize / 1024) + 'KB' })
  } catch (error: any) {
    console.error('Error generando reporte:', error)
    res.status(500).json({ error: 'Error generando reporte', detail: error.message })
  }
})

async function cleanupStuckReports() {
  try {
    const cutoff = new Date(Date.now() - 10 * 60 * 1000)
    const stuck = await prisma.report.updateMany({
      where: { status: 'GENERATING' as any, createdAt: { lt: cutoff } },
      data: { status: 'FAILED' as any, reportTitle: 'Error — Tiempo de espera agotado' }
    })
    if (stuck.count > 0) console.log(stuck.count + ' reportes atascados marcados como FAILED')
  } catch(e) {}
}
setInterval(cleanupStuckReports, 2 * 60 * 1000)

// GET /api/reports/status/:projectId — estado del reporte en curso
router.get('/status/:projectId', requireAuth, async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId as string
    const userId = req.userId!
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project || (project as any).userId !== userId) {
      return res.status(403).json({ error: 'No autorizado' })
    }
    const generating = await prisma.report.findFirst({
      where: { projectId, status: 'GENERATING' as any },
      orderBy: { createdAt: 'desc' }
    })
    if (generating) {
      const minutosGenerando = (Date.now() - new Date((generating as any).createdAt).getTime()) / (1000 * 60)
      return res.json({ status: 'generating', minutosGenerando: Math.round(minutosGenerando) })
    }
    const lastCompleted = await prisma.report.findFirst({
      where: { projectId, status: 'COMPLETED' as any },
      orderBy: { createdAt: 'desc' }
    })
    if (lastCompleted) {
      return res.json({ status: 'completed', reportId: lastCompleted.id })
    }
    return res.json({ status: 'idle' })
  } catch(e: any) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/reports/signed-url/:reportId — genera URL fresca on-demand
router.get('/signed-url/:reportId', requireAuth, async (req: Request, res: Response) => {
  try {
    const reportId = req.params.reportId as string
    const userId = req.userId!

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: { project: true } as any
    })

    if (!report) return res.status(404).json({ error: 'Reporte no encontrado' })

    if ((report as any).project?.userId !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para descargar este reporte' })
    }

    if (!report.r2Key) return res.status(404).json({ error: 'PDF no disponible' })

    const { getSignedDownloadUrl } = await import('../lib/r2')
    const signedUrl = await getSignedDownloadUrl(report.r2Key)

    await prisma.report.update({
      where: { id: reportId },
      data: { r2Url: signedUrl }
    })

    res.json({ url: signedUrl })
  } catch(e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/download/:filename', async (req: Request, res: Response) => {
  const filename = req.params.filename as string
  try {
    const report = await prisma.report.findFirst({
      where: { OR: [{ r2Key: filename }, { r2Key: 'reports/' + filename }, { r2Key: filename.replace('reports/', '') }] }
    })
    if (report?.r2Url) return res.redirect(report.r2Url)
    const filePath = path.join(__dirname, '../../outputs', filename)
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"')
      return fs.createReadStream(filePath).pipe(res)
    }
    return res.status(404).json({ error: 'Archivo no encontrado' })
  } catch(e: any) { return res.status(500).json({ error: e.message }) }
})

export default router
