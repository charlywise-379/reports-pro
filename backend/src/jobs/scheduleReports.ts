import { reportQueue } from '../lib/queue'
import { prisma } from '../lib/prisma'

export async function scheduleReports() {
  try {
    console.log('[Scheduler] Revisando proyectos para reportes automaticos...')

    const now = new Date()

    // Calcular hora actual en CST (UTC-6)
    const cstOffset = -6 * 60
    const cstNow = new Date(now.getTime() + (cstOffset - now.getTimezoneOffset()) * 60000)
    const dayOfWeek = cstNow.getDay() // 0=domingo, 6=sabado
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const currentHour = cstNow.getHours()
    const currentMinute = cstNow.getMinutes()

    // Obtener todos los proyectos activos con su setup
    const projects = await (prisma.project as any).findMany({
      where: {
        OR: [
          { trialEndsAt: { gt: now }, status: 'TRIAL' },
          { subscription: { stripeSubscriptionId: { not: null }, status: { in: ['ACTIVE', 'TRIALING'] } } }
        ]
      },
      include: {
        subscription: true,
        competitiveSetup: true,
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

      // Bloqueo fin de semana solo para DAILY
      if (isWeekend && freq === 'DAILY') {
        console.log(`[Scheduler] Fin de semana — saltando proyecto DAILY: ${project.name}`)
        continue
      }

      // Leer deliveryTime del additionalContext del setup
      let deliveryHour: number | null = null
      try {
        const setup = (project as any).competitiveSetup
        if (setup?.additionalContext) {
          const ctx = typeof setup.additionalContext === 'string'
            ? JSON.parse(setup.additionalContext)
            : setup.additionalContext
          if (ctx.deliveryTime) {
            // deliveryTime viene como "07:00" o "07:00 AM"
            const timeParts = ctx.deliveryTime.replace('AM','').replace('PM','').trim().split(':')
            deliveryHour = parseInt(timeParts[0], 10)
            // Si era PM y no es 12, sumar 12
            if (ctx.deliveryTime.includes('PM') && deliveryHour !== 12) deliveryHour += 12
          }
        }
      } catch(e) {}

      // Verificar ventana de hora de entrega (±30 minutos de la hora configurada)
      if (deliveryHour !== null) {
        const minutosDesdeHora = (currentHour * 60 + currentMinute) - (deliveryHour * 60)
        const enVentana = minutosDesdeHora >= 0 && minutosDesdeHora < 60
        if (!enVentana) {
          console.log(`[Scheduler] ${project.name} — fuera de ventana (configurado: ${deliveryHour}:00, actual CST: ${currentHour}:${String(currentMinute).padStart(2,'0')})`)
          continue
        }
        console.log(`[Scheduler] ${project.name} — EN ventana de entrega (${deliveryHour}:00 CST) ✓`)
      }

      const horasMinimas = frecuencyHours[freq] || 168
      const lastReport = project.reports?.[0]
      const horasDesdeUltimo = lastReport
        ? (Date.now() - new Date(lastReport.createdAt).getTime()) / (1000 * 60 * 60)
        : null

      console.log(`[Scheduler] ${project.name} — freq:${freq} horasMin:${horasMinimas} horasDesde:${horasDesdeUltimo ? Math.round(horasDesdeUltimo) : 'sin reporte'}`)

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

        // Anti-duplicado: no generar si ya hay uno en las últimas 4 horas
        const reporteMuyReciente = await prisma.report.findFirst({
          where: {
            projectId: project.id,
            status: 'COMPLETED' as any,
            createdAt: { gt: new Date(Date.now() - 4 * 60 * 60 * 1000) }
          }
        })
        if (reporteMuyReciente) {
          console.log(`[Scheduler] Reporte generado hace menos de 4h para: ${project.name} — saltando`)
          continue
        }

        // Verificar que no haya ya un job en cola para este proyecto
        const waiting = await reportQueue.getWaiting()
        const active = await reportQueue.getActive()
        const allPending = [...waiting, ...active]
        const yaEnCola = allPending.some(j => j.data?.projectId === project.id)
        if (yaEnCola) {
          console.log('[Scheduler] Job ya en cola para: ' + project.name)
          continue
        }

        const jobId = 'scheduled-' + project.id + '-' + Date.now()
        await reportQueue.add(
          'generate-report',
          { projectId: project.id, userId: project.userId, trigger: 'scheduled' },
          { jobId }
        )

        encolados++
        console.log(`[Scheduler] Encolado: ${project.name} (${freq}) para las ${deliveryHour !== null ? deliveryHour + ':00' : 'hora libre'} CST`)
      }
    }

    console.log(`[Scheduler] ${encolados} reportes encolados`)
  } catch (e: any) {
    console.error('[Scheduler] Error:', e.message)
  }
}
