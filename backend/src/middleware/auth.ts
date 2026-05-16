import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

declare global {
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No autorizado — token requerido' })
    }

    const secret = process.env.SUPABASE_JWT_SECRET
    if (!secret) {
      console.error('❌ Missing SUPABASE_JWT_SECRET')
      return res.status(500).json({ error: 'Configuración de servidor incompleta' })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, secret) as any
    req.userId = decoded.sub
    next()
  } catch (e: any) {
    return res.status(401).json({ error: 'Token inválido o expirado' })
  }
}
