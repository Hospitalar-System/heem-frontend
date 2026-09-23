import { useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import type { ThemeMode } from './theme-mode'
import { ThemeContext } from './theme-context'
const storageKey = 'heem-theme-mode'

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(storageKey)
    return stored === 'light' || stored === 'auto' || stored === 'dark' ? stored : 'dark'
  })

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark', 'light', 'auto')
    root.classList.add(mode)
    localStorage.setItem(storageKey, mode)
  }, [mode])

  const value = useMemo(
    () => ({ mode, setMode: (next: ThemeMode) => setModeState(next) }),
    [mode],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
