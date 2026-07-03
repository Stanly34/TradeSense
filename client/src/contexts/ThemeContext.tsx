import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'
export type Theme = 'light' | 'dark'

export interface ThemeContextType {
  themeMode: ThemeMode
  activeTheme: Theme
  setThemeMode: (mode: ThemeMode) => void
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextType | null>(null)

const STORAGE_KEY = 'tradesense_theme'

function resolveTheme(mode: ThemeMode): Theme {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return mode
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
}

function getInitialMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return 'dark'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(getInitialMode)
  const [activeTheme, setActiveTheme] = useState<Theme>(() => {
    const mode = getInitialMode()
    const t = resolveTheme(mode)
    applyTheme(t)
    return t
  })

  const recalc = useCallback((mode: ThemeMode) => {
    const t = resolveTheme(mode)
    console.log('[ThemeContext] recalc mode=%s resolved=%s', mode, t)
    setActiveTheme(t)
    applyTheme(t)
    localStorage.setItem(STORAGE_KEY, mode)
  }, [])

  useEffect(() => {
    recalc(themeMode)
  }, [themeMode, recalc])

  useEffect(() => {
    if (themeMode !== 'system') return

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const t = resolveTheme('system')
      setActiveTheme(t)
      applyTheme(t)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [themeMode])

  const setThemeMode = useCallback((mode: ThemeMode) => {
    console.log('[ThemeContext] setThemeMode called with:', mode)
    setThemeModeState(mode)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeModeState((prev) => {
      if (prev === 'system') {
        const t = resolveTheme('system')
        return t === 'dark' ? 'light' : 'dark'
      }
      return prev === 'dark' ? 'light' : 'dark'
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ themeMode, activeTheme, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
