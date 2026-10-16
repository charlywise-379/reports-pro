'use client'

import type { CSSProperties, SelectHTMLAttributes } from 'react'

type Tone = 'dark' | 'light'

export interface SelectColors {
  bg: string
  fg: string
  border: string
  accent: string
  popup: string
}

const TONES: Record<Tone, SelectColors> = {
  dark: { bg: 'rgba(255,255,255,0.05)', fg: '#F0F2FF', border: 'rgba(139,123,255,0.3)', accent: '#8B7BFF', popup: '#1A1730' },
  light: { bg: '#F0EEFF', fg: '#26215C', border: '#CECBF6', accent: '#534AB7', popup: '#FFFFFF' },
}

interface Props extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'style'> {
  tone?: Tone
  /** Sobrescribe colores del tono (p. ej. la paleta de Operations). */
  colors?: Partial<SelectColors>
  /** Solo distribución (ancho, márgenes); los colores salen del tono. */
  style?: CSSProperties
}

export default function Select({ tone = 'dark', colors, style, className, children, ...rest }: Props) {
  const c = { ...TONES[tone], ...colors }
  const vars = {
    '--sel-bg': c.bg,
    '--sel-fg': c.fg,
    '--sel-border': c.border,
    '--sel-accent': c.accent,
    '--sel-popup': c.popup,
  } as CSSProperties
  return (
    <select {...rest} data-tone={tone} className={`ui-select${className ? ` ${className}` : ''}`} style={{ ...vars, ...style }}>
      {children}
    </select>
  )
}
