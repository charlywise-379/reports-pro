// Proyecto activo del dashboard para cuentas partner (varias empresas por usuario).
// Prioridad: ?projectId= en la URL, luego el último elegido guardado en el navegador.
const key = (userId: string) => `omnireports_project_${userId}`

export function getSelectedProjectId(userId: string): string | null {
  if (typeof window === 'undefined') return null
  const fromUrl = new URLSearchParams(window.location.search).get('projectId')
  if (fromUrl) return fromUrl
  try { return window.localStorage.getItem(key(userId)) } catch { return null }
}

export function setSelectedProjectId(userId: string, projectId: string | null): void {
  try {
    if (projectId) window.localStorage.setItem(key(userId), projectId)
    else window.localStorage.removeItem(key(userId))
  } catch {}
}

export function dashboardUrl(backend: string, userId: string, projectId: string | null = getSelectedProjectId(userId)): string {
  return `${backend}/api/dashboard/${userId}${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`
}
