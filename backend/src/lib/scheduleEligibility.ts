// Un proyecto solo puede recibir reportes programados cuando su onboarding terminó
// (competitiveSetup con companyName). Evita gastar el reporte gratis de una empresa en borrador.
export function hasConfiguredSetup(project: { competitiveSetup?: { companyName?: string | null } | null }): boolean {
  const name = project?.competitiveSetup?.companyName
  return typeof name === 'string' && name.trim().length > 0
}
