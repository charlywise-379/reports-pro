import jwt from 'jsonwebtoken'

export type AdminTokenPayload = {
  adminId: string
  role: 'SUPER_ADMIN' | 'ADMIN'
}

function getSecret(): string {
  const secret = process.env.ADMIN_JWT_SECRET
  if (!secret) throw new Error('ADMIN_JWT_SECRET no configurada')
  return secret
}

export function signAdminToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: '12h' })
}

export function verifyAdminToken(token: string): AdminTokenPayload | null {
  try {
    return jwt.verify(token, getSecret()) as AdminTokenPayload
  } catch {
    return null
  }
}
