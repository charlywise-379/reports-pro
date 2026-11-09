// Helpers compartidos por las versiones del prompt y por reportEngine (movidos sin cambios desde
// reportEngine.ts al separar los prompts en versiones).

// ─── Inferir giro real del negocio ───────────────────
export function inferBusinessType(setup: any): string {
  const products = (setup.mainProducts || []).join(' ').toLowerCase()
  const ctx = (() => { try { return typeof setup.additionalContext === 'string' ? JSON.parse(setup.additionalContext) : (setup.additionalContext || {}) } catch { return {} } })()
  const pitch = (ctx.pitch || '').toLowerCase()
  const combined = products + ' ' + pitch
  if (combined.includes('campaña') || combined.includes('digital') || combined.includes('branding') || combined.includes('contenido') || combined.includes('publicidad') || combined.includes('agencia') || combined.includes('marketing')) return 'Agencia de Marketing Digital y Publicidad'
  if (combined.includes('web') || combined.includes('ecommerce') || combined.includes('app') || combined.includes('software') || combined.includes('desarrollo')) return 'Empresa de Desarrollo de Software y Tecnología'
  if (combined.includes('foto') || combined.includes('video') || combined.includes('producción') || combined.includes('audiovisual')) return 'Productora Audiovisual / Estudio Creativo'
  if (combined.includes('educación') || combined.includes('curso') || combined.includes('capacitación')) return 'Empresa Educativa / EdTech'
  if (combined.includes('salud') || combined.includes('médico') || combined.includes('clínica')) return 'Empresa del Sector Salud'
  return setup.industry || 'Empresa PYME en México'
}

/**
 * Competidores directos registrados por el cliente, desde cualquiera de las formas guardadas:
 * additionalContext.directCompetitors (onboarding actual), competitor1..5Name (columnas) o
 * setup.directCompetitors (fixtures). Sin duplicados por nombre.
 */
export function registeredDirectCompetitors(setup: any): Array<{ name: string; url?: string; products?: string }> {
  if (!setup) return []
  let ctx: any = {}
  try { ctx = typeof setup.additionalContext === 'string' ? JSON.parse(setup.additionalContext) : (setup.additionalContext || {}) } catch {}
  const fromCols = [1, 2, 3, 4, 5].filter(i => setup[`competitor${i}Name`])
    .map(i => ({ name: setup[`competitor${i}Name`], url: setup[`competitor${i}Website`] || undefined }))
  const all = [...(Array.isArray(ctx.directCompetitors) ? ctx.directCompetitors : []), ...fromCols,
    ...(Array.isArray(setup.directCompetitors) ? setup.directCompetitors : [])]
  const seen = new Set<string>()
  return all.filter((c: any) => typeof c?.name === 'string' && c.name.trim())
    .filter((c: any) => { const k = c.name.trim().toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true })
    .map((c: any) => ({ name: c.name.trim(), url: c.url || undefined, products: c.products || undefined }))
}

export function extractSetupContext(setup: any) {
  try {
    const ctx = typeof setup.additionalContext === 'string' ? JSON.parse(setup.additionalContext) : (setup.additionalContext || {})
    const products = (ctx.products || []).map((p: any) => `• ${p.name} (${p.category}): $${Number(p.priceFrom).toLocaleString('es-MX')} – $${Number(p.priceTo).toLocaleString('es-MX')} MXN`).join('\n')
    const directComps = (ctx.directCompetitors || []).map((c: any) => `• ${c.name} | URL: ${c.url} | Servicios: ${c.products} | Presencia: ${c.presence} | Amenaza: ${c.threat}/10`).join('\n')
    const indirectComps = (ctx.indirectCompetitors || []).map((c: any) => `• ${c.name} | Industria: ${c.industry} | Amenaza: ${c.threat}/10`).join('\n')
    const differentiators = (ctx.differentiators || []).slice(0, 10).join(', ')
    const pitch = ctx.pitch || ''
    return { products, directComps, indirectComps, differentiators, pitch }
  } catch {
    const fallbackProds = (setup.mainProducts || []).map((p: string) => `• ${p}`).join('\n')
    const fallbackComps = [1,2,3,4,5].filter((i: number) => setup[`competitor${i}Name`]).map((i: number) => `• ${setup[`competitor${i}Name`]} | URL: ${setup[`competitor${i}Website`] || 'N/A'}`).join('\n')
    return { products: fallbackProds, directComps: fallbackComps, indirectComps: '', differentiators: '', pitch: '' }
  }
}
