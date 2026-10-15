// Renderizador de plantillas de reporte. Extraído de reportEngine.ts sin cambios de
// comportamiento; la opción `escape` (usada por v2) escapa HTML en cada valor.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function renderTemplate(template: string, data: any, options?: { escape?: boolean }): string {
  const out = (v: unknown): string => (options?.escape ? escapeHtml(String(v)) : String(v))
  let html = template

  const processEach = (str: string, context: any): string => {
    let result = str
    let maxPasses = 5
    while (maxPasses-- > 0) {
      const before = result
      result = result.replace(/\{\{#each ([\w.]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_match, key, block) => {
        let arr: any[]
        if (key === 'this') arr = Array.isArray(context) ? context : []
        else if (key.startsWith('this.')) arr = context?.[key.slice(5)] ?? []
        else arr = context?.[key] ?? []
        if (!Array.isArray(arr)) return ''
        return arr.map((item: any) => {
          let rendered = processEach(block, item)
          rendered = rendered.replace(/\{\{this\.(\w+)\}\}/g, (_: string, prop: string) => item?.[prop] !== undefined ? out(item[prop]) : '')
          rendered = rendered.replace(/\{\{this\}\}/g, () => typeof item === 'string' ? out(item) : '')
          rendered = rendered.replace(/\{\{(\w+)\}\}/g, (_: string, prop: string) => {
            if (item?.[prop] !== undefined) return out(item[prop])
            if (context?.[prop] !== undefined) return out(context[prop])
            return ''
          })
          return rendered
        }).join('')
      })
      if (result === before) break
    }
    return result
  }

  html = processEach(html, data)
  html = html.replace(/\{\{(\w+)\}\}/g, (_match, key) => data[key] !== undefined ? out(data[key]) : '')
  return html
}
