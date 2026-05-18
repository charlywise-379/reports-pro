import { reportQueue } from '../lib/queue'
import { prisma } from '../lib/prisma'

export async function scheduleReports() {
  try {
    console.log('[Scheduler] Revisando proyectos para reportes automaticos...')

    const now = new Date()

    // Obtener todos los proyectos activos
    const projects = await (prisma.project as any).findMany({
      where: {
        OR: [
          // Trial vigente
          { trialEndsAt: { gt: now }, status: 'TRIAL' },
          // Suscripcion activa via Stripe
          { subscription: { stripeSubscriptionId: { not: null } } }
        ]
      },
      include: {
        subscription: true,
        reports: {
          where: { status: 'COMPLETED' as any },
          orderBy: { createdAt: 'desc' },
          take: 1,
        }
      }
    })

    console.log(`[Scheduler] ${projects.length} proyectos activos encontrados`)

    const frecuencyHours: Record<string, number> = {
      DAILY: 24, WEEKLY: 168, BIWEEKLY: 336, MONTHLY: 720
    }

    let encolados = 0

    for (const project of projects) {
      const freq = project.frequency || 'WEEKLY'
      const horasMinimas = frecuencyHours[freq] || 168
      const lastReport = project.reports?.[0]

      // Si no hay reporte previo o ya paso el tiempo suficiente
      const debeGenerar = !lastReport ||
        (Date.now() - new Date(lastReport.createdAt).getTime()) / (1000 * 60 * 60) >= horasMinimas

      if (debeGenerar) {
        // Verificar que no haya un reporte GENERATING en proceso
        const hayGenerando = await prisma.report.findFirst({
          where: { projectId: project.id, status: 'GENERATING' as any }
        })
        if (hayGenerando) continue

        // Verificar que no haya ya un job en cola para este proyecto
        const jobId = 'scheduled-' + project.id
        const existingJob = await reportQueue.getJob(jobId)
        if (existingJob) {
          const state = await existingJob.getState()
          if (state === 'waiting' || state === 'active') {
            console.log('[Scheduler] Job ya en cola para: ' + project.name)
            continue
          }
        }

        await reportQueue.add(
          'generate-report',
          { projectId: project.id, userId: project.userId, trigger: 'scheduled' },
          { jobId }
        )

        encolados++
        console.log(`[Scheduler] Encolado: ${project.name} (${freq})`)
      }
    }

    console.log(`[Scheduler] ${encolados} reportes encolados`)
  } catch (e: any) {
    console.error('[Scheduler] Error:', e.message)
  }
}
