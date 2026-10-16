// Cuántas empresas (proyectos) puede tener un usuario. PARTNER no tiene tope; el resto, `maxProjects` (por defecto 1).
export interface ProjectLimitInfo { max: number | null; used: number; canCreate: boolean }

export function projectLimitInfo(p: {
  accountType: string | null | undefined
  maxProjects: number | null | undefined
  projectCount: number
}): ProjectLimitInfo {
  if (p.accountType === 'PARTNER') return { max: null, used: p.projectCount, canCreate: true }
  const max = Math.max(1, Math.floor(Number(p.maxProjects) || 1))
  return { max, used: p.projectCount, canCreate: p.projectCount < max }
}

export const projectLimitMessage = (max: number): string =>
  `Alcanzaste el máximo de ${max} ${max === 1 ? 'empresa' : 'empresas'}`
