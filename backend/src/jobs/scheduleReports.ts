import { reportQueue } from '../lib/queue'
import { prisma } from '../lib/prisma'

export async function scheduleReports() {
  try {
    console.log('[Scheduler] Revisando proyectos para reportes automaticos...')

    const now = new Date()

    // Calcular día actual en CST (UTC-6)
    const cstOffset = -6 * 60
    const cstNow = new Date(now.getTime() + (cstOffset - now.getTimezoneOffset()) * 60000)
    const dayOfWeek = cstNow.getDay() // 0=domingo, 6=sabado
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    // Obtener todos los proyectos activos
    const projects = await (prisma.project as any).findMany({
      where: {
        OR: [
          // Trial vigente
          { trialEndsAt: { gt: now }, status: 'TRIAL' },
          // Suscripcion activa via Stripe (ACTIVE o TRIALING)
          { subscription: { stripeSubscriptionId: { not: null }, status: { in: ['ACTIVE', 'TRIALING'] } } }
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
      DAILY: 22, WEEKLY: 168, BIWEEKLY: 336, MONTHLY: 720
    }

    let encolados = 0

    for (const project of projects) {
      const freq = project.frequency || 'WEEKLY'

      // BUG #7 FIX: el bloqueo de fin de semana solo aplica a planes DAILY
      // Planes WEEKLY, BIWEEKLY y MONTHLY corren cualquier día de la semana
      if (isWeekend && freq === 'DAILY') {
        console.log(`[Scheduler] Fin de semana — saltando proyecto DAILY: ${project.name}`)
        continue
      }

      const horasMinimas = frecuencyHours[freq] || 168
      const lastReport = project.reports?.[0]
      const horasDesdeUltimo = lastReport
        ? (Date.now() - new Date(lastReport.createdAt).getTime()) / (1000 * 60 * 60)
        : null

      console.log(`[Scheduler] ${project.name} — freq:${freq} horasMin:${horasMinimas} horasDesde:${horasDesdeUltimo ? Math.round(horasDesdeUltimo) : 'sin reporte'}`)

      // Si no hay reporte previo o ya pasó el tiempo suficiente
      const debeGenerar = !lastReport ||
        (Date.now() - new Date(lastReport.createdAt).getTime()) / (1000 * 60 * 60) >= horasMinimas

      if (debeGenerar) {
        // Verificar que no haya un reporte GENERATING en proceso
        const hayGenerando = await prisma.report.findFirst({
          where: { projectId: project.id, status: 'GENERATING' as any }
        })
        if (hayGenerando) {
          console.log(`[Scheduler] Reporte ya generando para: ${project.name} — saltando`)
          continue
        }

        // Verificar que no haya un reporte COMPLETED en las últimas 2 horas (anti-duplicado post-redeploy)
        const reporteReciente = await prisma.report.findFirst({
          where: {
            projectId: project.id,
            status: 'COMPLETED' as any,
            createdAt: { gt: new Date(Date.now() - 2 * 60 * 60 * 1000) }
          }
        })
        if (reporteReciente) {
          console.log(`[Scheduler] Reporte generado hace menos de 2h para: ${project.name} — saltando`)
          continue
        }

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
