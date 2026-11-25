import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const KEY = 'theme'

function stored(): Theme | null {
  try {
    const value = localStorage.getItem(KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

function systemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function apply(theme: Theme | null) {
  if (theme) document.documentElement.setAttribute('data-theme', theme)
  else document.documentElement.removeAttribute('data-theme')
}

/** Applies a stored choice before the first render (an absent choice follows the OS). */
export function initTheme() {
  apply(stored())
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => stored() ?? systemTheme())

  useEffect(() => {
    apply(stored() ?? theme)
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // storage unavailable: the choice only lasts for this page view
    }
    apply(next)
    setThemeState(next)
  }, [])

  const toggle = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [theme, setTheme])
  return { theme, setTheme, toggle }
}
