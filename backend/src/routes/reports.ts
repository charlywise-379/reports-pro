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
      const deliveryEmail = project.deliveryEmail
      if (deliveryEmail) {
        const { sendReportEmail } = await import('../lib/email')
        const setup = (project as any).competitiveSetup
        const companyName = setup?.companyName || 'Tu empresa'
        const now = new Date()
        const weekNumber = Math.ceil((now.getDate() + new Date(now.getFullYear(), now.getMonth(), 1).getDay()) / 7)
        const reportCount = await prisma.report.count({ where: { projectId, status: 'COMPLETED' as any } })
        await sendReportEmail(deliveryEmail, companyName, signedUrl, weekNumber, reportCount)
      }
    } catch(emailErr: any) { console.error('Error enviando email:', emailErr.message) }
    res.status(200).json({ success: true, message: 'Reporte generado correctamente', filename, fileSize: Math.round(fileSize / 1024) + 'KB' })
  } catch (error: any) {
    console.error('Error generando reporte:', error)
    res.status(500).json({ error: 'Error generando reporte', detail: error.message })
  }
})

async function cleanupStuckReports() {
  try {
    const cutoff = new Date(Date.now() - 15 * 60 * 1000)
    const stuck = await prisma.report.updateMany({
      where: { status: 'GENERATING' as any, createdAt: { lt: cutoff } },
      data: { status: 'FAILED' as any, reportTitle: 'Error — Tiempo de espera agotado' }
    })
    if (stuck.count > 0) console.log(stuck.count + ' reportes atascados marcados como FAILED')
  } catch(e) {}
}
setInterval(cleanupStuckReports, 5 * 60 * 1000)

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
