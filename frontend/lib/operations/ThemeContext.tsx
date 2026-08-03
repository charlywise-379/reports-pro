'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { getStoredTheme, setStoredTheme, Theme } from './theme'

const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void }>({
  theme: 'dark',
  toggleTheme: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Inicializar en 'dark' de forma sincrónica (coincide con el comportamiento SSR actual de getStoredTheme,
  // que no puede leer localStorage durante SSR). Se corrige en el mount effect de abajo.
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    setTheme(getStoredTheme())
  }, [])

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark'
      setStoredTheme(next)
      return next
    })
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
