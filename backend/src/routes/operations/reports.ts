import { Router, Request, Response } from 'express'
import { prisma } from '../../lib/prisma'
import { requireAdmin } from '../../middleware/requireAdmin'
import { reportQueue } from '../../lib/queue'
import { getSignedDownloadUrl, deleteFromR2 } from '../../lib/r2'

const router = Router()

router.get('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { module, status, search, page = '1', pageSize = '25' } = req.query as Record<string, string>
    const skip = (parseInt(page) - 1) * parseInt(pageSize)
    const take = parseInt(pageSize)

    const where: any = {}
    if (status) where.status = status
    if (module) where.project = { serviceType: module }
    if (search) {
      where.project = { ...(where.project || {}), name: { contains: search, mode: 'insensitive' } }
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { project: { select: { name: true, serviceType: true, userId: true, user: { select: { email: true } } } } },
      }),
      prisma.report.count({ where }),
    ])

    res.json({ reports, total, page: parseInt(page), pageSize: take })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/export', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { module, status } = req.query as Record<string, string>
    const where: any = {}
    if (status) where.status = status
    if (module) where.project = { serviceType: module }

    const reports = await prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { project: { select: { name: true, serviceType: true, user: { select: { email: true } } } } },
    })

    const header = 'id,projectName,userEmail,module,status,pdfSizeBytes,createdAt\n'
    const rows = reports.map(r =>
      [r.id, r.project.name, r.project.user.email, r.project.serviceType, r.status, r.pdfSizeBytes || '', r.createdAt.toISOString()]
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    ).join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="reportes.csv"')
    res.send(header + rows)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const report = await prisma.report.findUnique({
      where: { id: req.params.id as string },
      include: { project: { include: { user: { select: { email: true, fullName: true } } } } },
    })
    if (!report) return res.status(404).json({ error: 'Reporte no encontrado' })
    res.json(report)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/:id/download', requireAdmin, async (req: Request, res: Response) => {
  try {
    const report = await prisma.report.findUnique({ where: { id: req.params.id as string } })
    if (!report || !report.r2Key) return res.status(404).json({ error: 'Reporte no disponible para descarga' })
    // No usar report.r2Url guardado — la signed URL expira a los 7 dias.
    // Regenerar on-demand con el mismo helper que usa el endpoint publico de descarga.
    const signedUrl = await getSignedDownloadUrl(report.r2Key)
    res.redirect(signedUrl)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/:id/regenerate', requireAdmin, async (req: Request, res: Response) => {
  try {
    const report = await prisma.report.findUnique({ where: { id: req.params.id as string }, include: { project: true } })
    if (!report) return res.status(404).json({ error: 'Reporte no encontrado' })

    const jobId = 'admin-regenerate-' + report.projectId + '-' + Date.now()
    await reportQueue.add('generate-report', { projectId: report.projectId, userId: report.project.userId, trigger: 'manual' }, { jobId })

    await prisma.auditLog.create({
      data: { userId: req.adminId!, event: 'admin_regenerate_report', metadata: { reportId: report.id, projectId: report.projectId } },
    })

    res.status(202).json({ ok: true, message: 'Reporte encolado para regeneración' })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const report = await prisma.report.findUnique({ where: { id: req.params.id as string } })
    if (!report) return res.status(404).json({ error: 'Reporte no encontrado' })

    if (report.r2Key) {
      await deleteFromR2(report.r2Key).catch(() => {})
    }
    await prisma.report.delete({ where: { id: req.params.id as string } })

    await prisma.auditLog.create({
      data: { userId: req.adminId!, event: 'admin_delete_report', metadata: { reportId: req.params.id as string, projectId: report.projectId } },
    })

    res.json({ ok: true })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

export default router
