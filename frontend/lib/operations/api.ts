// api.omnireports.pro (no *.railway.app) — mismo dominio registrable que el frontend,
// necesario para que la cookie admin_session (SameSite=Lax) viaje en cada request.
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.omnireports.pro'

export async function adminFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${BACKEND}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (res.status === 401 && typeof window !== 'undefined' && !window.location.pathname.endsWith('/operations/login')) {
    window.location.href = '/operations/login'
  }

  return res
}
