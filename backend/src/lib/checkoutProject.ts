// Qué proyecto cobra el checkout: el que pide el cliente (si es del usuario) o el primero, como hasta ahora.
export type CheckoutProjectResult =
  | { ok: true; projectId: string }
  | { ok: false; status: 400 | 403 | 404; error: string }

export function resolveCheckoutProjectId(userProjects: { id: string }[], requested: unknown): CheckoutProjectResult {
  if (userProjects.length === 0) return { ok: false, status: 404, error: 'Proyecto no encontrado' }
  if (requested === undefined || requested === null || requested === '') return { ok: true, projectId: userProjects[0].id }
  if (typeof requested !== 'string') return { ok: false, status: 400, error: 'projectId no válido' }
  const match = userProjects.find(p => p.id === requested)
  return match ? { ok: true, projectId: match.id } : { ok: false, status: 403, error: 'El proyecto no te pertenece' }
}
