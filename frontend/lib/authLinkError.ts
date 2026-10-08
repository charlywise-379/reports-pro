// Supabase devuelve los errores de los links de correo en el fragmento de la URL:
// /login?confirmed=1#error=access_denied&error_code=otp_expired&error_description=...
export type AuthLinkError = 'expired' | 'invalid' | null

export function parseAuthLinkError(hash: string): AuthLinkError {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  if (!params.get('error') && !params.get('error_code')) return null
  return params.get('error_code') === 'otp_expired' ? 'expired' : 'invalid'
}

export function isEmailNotConfirmed(error: { code?: string; message?: string } | null | undefined): boolean {
  return !!error && (error.code === 'email_not_confirmed' || /email not confirmed/i.test(error.message || ''))
}

export async function resendConfirmationEmail(email: string): Promise<boolean> {
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://reports-pro-production.up.railway.app'
  try {
    const res = await fetch(`${backend}/api/auth/resend-confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    return res.ok
  } catch {
    return false
  }
}
