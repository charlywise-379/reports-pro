import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { generateReport } from '../lib/reportEngine'
import { uploadPDFToR2 } from '../lib/r2'
import path from 'path'
import fs from 'fs'

const router = Router()

// POST /api/reports/generate/:projectId
router.post('/generate/:projectId', async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string

  try {
    console.log(`🚀 Iniciando generación de reporte para proyecto: ${projectId}`)

    // 1. Buscar proyecto en DB
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { competitiveSetup: true },
    })

    if (!project) {
      return res.status(404).json({ error: 'Proyecto no encontrado' })
    }

    // 2. Crear carpeta de salida si no existe
    const outputDir = path.join(__dirname, '../../outputs')
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // 3. Definir nombre del archivo
    const filename = `report-${projectId}-${Date.now()}.pdf`
    const outputPath = path.join(outputDir, filename)

    // 4. Crear registro en DB antes de generar
    const reportRecord = await prisma.report.create({
      data: {
        projectId,
        status: 'GENERATING' as any,
        r2Key: `reports/${filename}`,
      }
    })

    // 5. Preparar datos del proyecto con setup
    const projectWithSetup = {
      ...project,
      setup: (project as any).competitiveSetup,
      reportId: reportRecord.id,
    }

    // 6. Generar PDF
    await generateReport(projectWithSetup, outputPath)

    // 7. Subir PDF a R2
    const signedUrl = await uploadPDFToR2(outputPath, filename)

    // 8. Marcar reporte como completado con URL de R2
    await prisma.report.update({
      where: { id: reportRecord.id },
      data: {
        status: 'COMPLETED' as any,
        pdfSizeBytes: fs.statSync(outputPath).size,
        r2Key: `reports/${filename}`,
        r2Url: signedUrl,
      }
    })

    // 6. Verificar que el archivo existe
    if (!fs.existsSync(outputPath)) {
      throw new Error('El PDF no se generó correctamente')
    }

    const fileSize = fs.statSync(outputPath).size
    console.log(`📦 PDF generado: ${filename} (${Math.round(fileSize / 1024)}KB)`)

    res.status(200).json({
      success: true,
      message: 'Reporte generado correctamente',
      filename,
      downloadUrl: `/api/reports/download/${filename}`,
      fileSize: `${Math.round(fileSize / 1024)}KB`,
    })

  } catch (error: any) {
    console.error('❌ Error generando reporte:', error)
    res.status(500).json({ error: 'Error generando reporte', detail: error.message })
  }
})

// GET /api/reports/download/:filename
router.get('/download/:filename', async (req: Request, res: Response) => {
  const filename = req.params.filename as string

  try {
    // Buscar en DB por r2Key
    const report = await prisma.report.findFirst({
      where: { OR: [{ r2Key: filename }, { r2Key: `reports/${filename}` }] }
    })

    if (report?.r2Url) {
      return res.redirect(report.r2Url)
    }

    // Fallback: buscar en disco local
    const filePath = path.join(__dirname, '../../outputs', filename)
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      return fs.createReadStream(filePath).pipe(res)
    }

    return res.status(404).json({ error: 'Archivo no encontrado' })
  } catch(e: any) {
    return res.status(500).json({ error: e.message })
  }
})

export default router