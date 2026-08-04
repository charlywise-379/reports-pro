export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'operations_theme'

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  return (localStorage.getItem(STORAGE_KEY) as Theme) || 'dark'
}

export function setStoredTheme(theme: Theme) {
  localStorage.setItem(STORAGE_KEY, theme)
}

export const palette = {
  dark: {
    bg: '#0F1117',
    surface: '#171923',
    surfaceHover: '#1D2029',
    border: 'rgba(255,255,255,0.08)',
    text: '#F0F2FF',
    textMuted: '#8A93A8',
    accent: '#8B7BFF',
    accentHover: '#9D8FFF',
    danger: '#F87171',
    success: '#4ADE80',
    warning: '#FBBF24',
    info: '#60A5FA',
  },
  light: {
    bg: '#F5F6FA',
    surface: '#FFFFFF',
    surfaceHover: '#F0F1F7',
    border: 'rgba(15,17,23,0.10)',
    text: '#171923',
    textMuted: '#5A627A',
    accent: '#6D5FE0',
    accentHover: '#5D4FD0',
    danger: '#DC2626',
    success: '#16A34A',
    warning: '#D97706',
    info: '#2563EB',
  },
}
