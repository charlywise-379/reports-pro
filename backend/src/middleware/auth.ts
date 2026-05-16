import { Request, Response, NextFunction } from 'express'
import { createClient } from '@supabase/supabase-js'

declare global {
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SRK

    if (!supabaseUrl || !supabaseKey) {
      console.error('Auth middleware: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
      return res.status(500).json({ error: 'Configuracion de servidor incompleta' })
    }

    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No autorizado — token requerido' })
    }

    const token = authHeader.split(' ')[1]
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ error: 'Token invalido o expirado' })
    }

    req.userId = user.id
    next()
  } catch (e: any) {
    return res.status(401).json({ error: 'Error de autenticacion' })
  }
}
