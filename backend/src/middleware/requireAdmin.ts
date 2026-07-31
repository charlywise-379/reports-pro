import { Request, Response, NextFunction } from 'express'
import { verifyAdminToken } from '../lib/adminAuth'

declare global {
  namespace Express {
    interface Request {
      adminId?: string
      adminRole?: 'SUPER_ADMIN' | 'ADMIN'
    }
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.admin_session
  if (!token) {
    return res.status(401).json({ error: 'No autorizado — sesión de administrador requerida' })
  }

  const payload = verifyAdminToken(token)
  if (!payload) {
    return res.status(401).json({ error: 'Sesión de administrador inválida o expirada' })
  }

  req.adminId = payload.adminId
  req.adminRole = payload.role
  next()
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.adminRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Requiere permisos de Super Admin' })
  }
  next()
}
