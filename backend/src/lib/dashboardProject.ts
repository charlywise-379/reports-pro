export interface ProjectQuery {
  where: { userId: string; id?: string }
  orderBy: { createdAt: 'desc' }
}

// Con projectId explícito se busca ese proyecto acotado al dueño (nunca el de otro usuario);
// sin él, el más reciente, que es el comportamiento histórico del dashboard.
export function buildProjectQuery(userId: string, requestedProjectId: unknown): ProjectQuery {
  const id = typeof requestedProjectId === 'string' && requestedProjectId.trim() ? requestedProjectId.trim() : undefined
  return { where: id ? { userId, id } : { userId }, orderBy: { createdAt: 'desc' } }
}

export interface ProjectListItem { id: string; name: string | null; companyName: string | null }

// Los partners y los usuarios con más de un proyecto reciben la lista; el resto, null.
export function projectListFor(
  accountType: string | null | undefined,
  projects: { id: string; name?: string | null; competitiveSetup?: { companyName?: string | null } | null }[],
): ProjectListItem[] | null {
  if (accountType !== 'PARTNER' && projects.length < 2) return null
  return projects.map(p => ({ id: p.id, name: p.name ?? null, companyName: p.competitiveSetup?.companyName ?? null }))
}
