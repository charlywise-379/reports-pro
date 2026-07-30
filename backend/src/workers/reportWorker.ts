import { Worker, Job } from 'bullmq'
import { connection, ReportJobData } from '../lib/queue'
import { prisma } from '../lib/prisma'
import { generateReport } from '../lib/reportEngine'
import { uploadPDFToR2 } from '../lib/r2'
import path from 'path'
import fs from 'fs'
import { MIN_HOURS_BY_FREQUENCY } from '../lib/frequency'

export function startReportWorker() {
  const worker = new Worker<ReportJobData>(
    'report-generation',
    async (job: Job<ReportJobData>) => {
      const { projectId, trigger } = job.data
      console.log(`[Worker] Procesando job ${job.id} — proyecto: ${projectId} — trigger: ${trigger}`)

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { competitiveSetup: true },
      })

      if (!project) throw new Error('Proyecto no encontrado: ' + projectId)

      // Verificar que el proyecto tiene suscripcion activa o trial vigente
      const now = new Date()
      const trialVigente = (project as any).trialEndsAt && new Date((project as any).trialEndsAt) > now
      const sub = await (prisma.subscription as any).findFirst({ where: { projectId } })
      const tieneStripe = sub?.stripeSubscriptionId != null && 
        ['active', 'trialing'].includes((sub?.status || '').toLowerCase())

      if (!trialVigente && !tieneStripe) {
        console.log(`[Worker] Proyecto ${projectId} sin suscripcion activa — saltando`)
        return { skipped: true, reason: 'no_active_subscription' }
      }

      // Verificar restriccion por frecuencia
      const lastReport = await prisma.report.findFirst({
        where: { projectId, status: 'COMPLETED' as any },
        orderBy: { createdAt: 'desc' }
      })

      if (lastReport && trigger === 'scheduled') {
        const frecuencyHours = MIN_HOURS_BY_FREQUENCY
        const freq = (project as any).frequency || 'WEEKLY'
        const horasMinimas = frecuencyHours[freq] || 160
        const horasTranscurridas = (Date.now() - new Date(lastReport.createdAt).getTime()) / (1000 * 60 * 60)
        if (horasTranscurridas < horasMinimas) {
          console.log(`[Worker] Reporte reciente — saltando (${Math.round(horasTranscurridas)}h < ${horasMinimas}h)`)
          return { skipped: true, reason: 'too_recent' }
        }
      }

      // Crear carpeta outputs
      const outputDir = path.join(__dirname, '../../../outputs')
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })

      const filename = 'report-' + projectId + '-' + Date.now() + '.pdf'
      const outputPath = path.join(outputDir, filename)

      // Crear registro GENERATING
      const reportRecord = await prisma.report.create({
        data: { projectId, status: 'GENERATING' as any, r2Key: 'reports/' + filename }
      })

      try {
        const projectWithSetup = {
          ...project,
          setup: (project as any).competitiveSetup,
          reportId: reportRecord.id,
        }

        await generateReport(projectWithSetup, outputPath)
        const signedUrl = await uploadPDFToR2(outputPath, filename)

        await prisma.report.update({
          where: { id: reportRecord.id },
          data: {
            status: 'COMPLETED' as any,
            pdfSizeBytes: fs.statSync(outputPath).size,
            r2Key: 'reports/' + filename,
            r2Url: signedUrl,
          }
        })

        const setup = (project as any).competitiveSetup
        const companyName = setup?.companyName || 'Tu empresa'
        const reportCount = await prisma.report.count({ where: { projectId, status: 'COMPLETED' as any } })

        if (project.deliveryEmail) {
          const { sendReportEmail } = await import('../lib/email')
          const setupForCC = (project as any).competitiveSetup
          let ccEmails: string[] = []
          try {
            const ctx = setupForCC?.additionalContext
              ? (typeof setupForCC.additionalContext === 'string' ? JSON.parse(setupForCC.additionalContext) : setupForCC.additionalContext)
              : {}
            ccEmails = ctx.ccEmails || []
          } catch(e) {}
          await sendReportEmail(project.deliveryEmail, companyName, signedUrl, reportCount, reportCount, ccEmails)
        }

        const deliveryPhone = (project as any).deliveryPhone
        const deliveryChannels = (project as any).deliveryChannels || []
        if (deliveryPhone && deliveryChannels.includes('WHATSAPP')) {
          const { sendReportWhatsApp } = await import('../lib/whatsapp')
          await sendReportWhatsApp(deliveryPhone, companyName, signedUrl, reportCount)
          console.log('[WhatsApp] Reporte enviado a ' + deliveryPhone)
        }

        console.log(`[Worker] Reporte completado: ${filename}`)
        return { success: true, filename }

      } catch (err: any) {
        await prisma.report.update({
          where: { id: reportRecord.id },
          data: { status: 'FAILED' as any, reportTitle: 'Error: ' + err.message }
        })
        throw err
      }
    },
    {
      connection,
      concurrency: 2,
    }
  )

  worker.on('completed', (job) => console.log(`[Worker] Job ${job.id} completado`))
  worker.on('failed', async (job, err) => {
    console.error(`[Worker] Job ${job?.id} fallido:`, err.message)

    if (!job) return
    if (job.attemptsMade < 3) return

    try {
      const project = await prisma.project.findUnique({
        where: { id: job.data.projectId },
        include: { competitiveSetup: true },
      })
      if (!project) return

      const companyName = (project as any).competitiveSetup?.companyName || 'Tu empresa'

      if (project.deliveryEmail) {
        const { sendReportErrorEmail } = await import('../lib/email')
        await sendReportErrorEmail(project.deliveryEmail, companyName)
      }

      const deliveryPhone = (project as any).deliveryPhone
      const deliveryChannels = (project as any).deliveryChannels || []
      if (deliveryPhone && deliveryChannels.includes('WHATSAPP')) {
        const { sendReportErrorWhatsApp } = await import('../lib/whatsapp')
        await sendReportErrorWhatsApp(deliveryPhone, companyName)
      }

      const { sendReportErrorAdminAlert } = await import('../lib/email')
      await sendReportErrorAdminAlert(companyName, job.data.projectId, err.message)

    } catch (notifyErr: any) {
      console.error('[Worker] Error notificando fallo de reporte:', notifyErr.message)
    }
  })

  console.log('Worker de reportes iniciado')
  return worker
}
