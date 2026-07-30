import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { requireProjectOwnership } from '../middleware/ownership'
import path from 'path'
import fs from 'fs'
import { MIN_HOURS_BY_FREQUENCY } from '../lib/frequency'
import { reportQueue } from '../lib/queue'

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
      const frecuencyHours = MIN_HOURS_BY_FREQUENCY
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

    // 🔒 ANTI-DUPLICADO (cola): verificar que no haya ya un job pendiente en BullMQ
    // para este proyecto — cierra la ventana entre "el scheduler encoló" y
    // "el worker creó la fila GENERATING", que el check anterior no cubre.
    const waiting = await reportQueue.getWaiting()
    const active = await reportQueue.getActive()
    const allPending = [...waiting, ...active]
    const yaEnCola = allPending.some(j => j.data?.projectId === projectId)
    if (yaEnCola) {
      return res.status(429).json({ error: 'generating', message: 'Ya hay un reporte generándose. Espera a que termine.' })
    }

    const jobId = 'manual-' + projectId + '-' + Date.now()
    await reportQueue.add(
      'generate-report',
      { projectId, userId, trigger: 'manual' },
      { jobId }
    )
    res.status(202).json({ success: true, message: 'Reporte encolado — se generará en los próximos minutos' })
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
router.get('/status/:projectId', requireAuth, requireProjectOwnership('projectId', 'project'), async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId as string
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
router.get('/signed-url/:reportId', requireAuth, requireProjectOwnership('reportId', 'report'), async (req: Request, res: Response) => {
  try {
    const reportId = req.params.reportId as string
    const report = req.ownedResource

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

router.get('/download/:filename', requireAuth, async (req: Request, res: Response) => {
  const filename = req.params.filename as string
  const userId = req.userId!
  try {
    const report = await prisma.report.findFirst({
      where: { OR: [{ r2Key: filename }, { r2Key: 'reports/' + filename }, { r2Key: filename.replace('reports/', '') }] },
      include: { project: true } as any
    })
    if (!report) return res.status(404).json({ error: 'Archivo no encontrado' })
    if ((report as any).project?.userId !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para descargar este reporte' })
    }
    if (report.r2Url) return res.redirect(report.r2Url)
    const filePath = path.join(__dirname, '../../outputs', filename)
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"')
      return fs.createReadStream(filePath).pipe(res)
    }
    return res.status(404).json({ error: 'Archivo no encontrado' })
  } catch(e: any) { return res.status(500).json({ error: e.message }) }
})

// GET /api/reports/public/:reportId/:token — link público permanente (usado en emails/WhatsApp), sin auth de sesión
router.get('/public/:reportId/:token', async (req: Request, res: Response) => {
  try {
    const { reportId, token } = req.params as { reportId: string; token: string }

    const report = await prisma.report.findUnique({ where: { id: reportId } })

    if (!report || report.downloadToken !== token) {
      return res.status(403).json({ error: 'Link inválido o expirado' })
    }

    if (!report.r2Key) {
      return res.status(404).json({ error: 'PDF no disponible' })
    }

    const { getSignedDownloadUrl } = await import('../lib/r2')
    const signedUrl = await getSignedDownloadUrl(report.r2Key)

    const ipAddress = typeof req.ip === 'string' ? req.ip : (Array.isArray(req.ip) ? req.ip[0] : null)
    const userAgent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null

    await prisma.reportAccessLog.create({
      data: {
        reportId: report.id,
        ipAddress,
        userAgent,
      }
    })

    return res.redirect(signedUrl)
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

export default router
