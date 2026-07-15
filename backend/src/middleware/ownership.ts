import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'

declare global {
  namespace Express {
    interface Request {
      ownedResource?: any
    }
  }
}

type ResourceType = 'project' | 'report'

export function requireProjectOwnership(paramName: string, resource: ResourceType) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params[paramName] as string
      const userId = req.userId!

      if (resource === 'project') {
        const project = await prisma.project.findUnique({ where: { id } })
        if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' })
        if ((project as any).userId !== userId) {
          return res.status(403).json({ error: 'No tienes permiso para acceder a este proyecto' })
        }
        req.ownedResource = project
        return next()
      }

      if (resource === 'report') {
        const report = await prisma.report.findUnique({
          where: { id },
          include: { project: true } as any
        })
        if (!report) return res.status(404).json({ error: 'Reporte no encontrado' })
        if ((report as any).project?.userId !== userId) {
          return res.status(403).json({ error: 'No tienes permiso para acceder a este reporte' })
        }
        req.ownedResource = report
        return next()
      }

      return res.status(500).json({ error: 'Tipo de recurso no soportado' })
    } catch (e: any) {
      return res.status(500).json({ error: e.message })
    }
  }
}
