// Tonos semánticos del reporte v2. La plantilla pinta con clases `tone-*`; aquí solo se decide
// qué tono corresponde a cada dato. Normaliza acentos porque la IA devuelve FÁCIL/DIFÍCIL/CRÍTICO.
export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'neutral'

export function norm(s: unknown): string {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase()
}

export const toneForPressure = (n: number): Tone => (n > 75 ? 'bad' : n > 50 ? 'warn' : 'ok')
export const toneForOpportunity = (n: number): Tone => (n >= 70 ? 'ok' : n >= 45 ? 'info' : 'warn')
export const toneForRisk = (n: number): Tone => (n > 60 ? 'bad' : n > 35 ? 'warn' : 'ok')
export const toneForThreat = (n: number): Tone => (n >= 8 ? 'bad' : n >= 5 ? 'warn' : 'ok')
export const toneForProbability = (n: number): Tone => (n >= 70 ? 'bad' : n >= 40 ? 'warn' : 'ok')

export function toneForLevel(label: unknown): Tone {
  switch (norm(label)) {
    case 'BAJO': return 'ok'
    case 'MEDIO':
    case 'VIGILAR': return 'warn'
    case 'ALTO':
    case 'CRITICO': return 'bad'
    default: return 'neutral'
  }
}

export function toneForDelta(text: unknown): Tone {
  const t = String(text ?? '')
  return t.includes('↑') ? 'ok' : t.includes('↓') ? 'bad' : 'neutral'
}

export function toneForPriority(p: unknown): Tone {
  switch (norm(p)) {
    case 'ALTA':
    case 'HIGH': return 'bad'
    case 'MED':
    case 'MEDIA':
    case 'MEDIUM': return 'warn'
    case 'BAJA':
    case 'LOW': return 'info'
    default: return 'neutral'
  }
}

export function priorityLabel(p: unknown): string {
  const n = norm(p)
  if (n === 'MED' || n === 'MEDIUM' || n === 'MEDIA') return 'MEDIA'
  if (n === 'HIGH' || n === 'ALTA') return 'ALTA'
  if (n === 'LOW' || n === 'BAJA') return 'BAJA'
  return n
}

export function toneForEffort(v: unknown): Tone {
  const t = norm(v)
  if (/^(FACIL|CORTO|BAJO)/.test(t)) return 'ok'
  if (/^MEDIO/.test(t)) return 'warn'
  if (/^(DIFICIL|LARGO|ALTO)/.test(t)) return 'bad'
  return 'neutral'
}

const EFFORT_LABELS: Record<'difficulty' | 'time' | 'cost', Record<Tone, string>> = {
  difficulty: { ok: 'Fácil de implementar', warn: 'Implementación media', bad: 'Complejo de implementar', info: 'Dificultad sin definir', neutral: 'Dificultad sin definir' },
  time: { ok: 'Tiempo corto', warn: 'Tiempo medio', bad: 'Tiempo largo', info: 'Tiempo sin definir', neutral: 'Tiempo sin definir' },
  cost: { ok: 'Bajo costo', warn: 'Inversión media', bad: 'Alta inversión', info: 'Costo sin definir', neutral: 'Costo sin definir' },
}

export function effortLabel(kind: 'difficulty' | 'time' | 'cost', v: unknown): string {
  return EFFORT_LABELS[kind][toneForEffort(v)]
}

export function toneForChangeCategory(cat: unknown): Tone {
  const first = norm(String(cat ?? '').split('·')[0])
  switch (first) {
    case 'PRECIO':
    case 'CAMPANA': return 'bad'
    case 'TALENTO':
    case 'MEDIOS': return 'warn'
    case 'EXPANSION':
    case 'ALIANZA': return 'info'
    case 'PRODUCTO': return 'ok'
    default: return 'neutral'
  }
}

export function toneForInsightCategory(cat: unknown): Tone {
  const whole = norm(cat)
  if (whole.includes('OPORTUNIDAD')) return 'ok'
  const parts = String(cat ?? '').split('·')
  const level = norm(parts[parts.length - 1])
  if (/^(CRITICO|ALTO|URGENTE)/.test(level)) return 'bad'
  if (/^MEDIO/.test(level)) return 'warn'
  return 'info'
}
