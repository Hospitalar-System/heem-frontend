import { useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import type { ThemeMode } from './theme-mode'
import { ThemeContext } from './theme-context'
const storageKey = 'heem-theme-mode'

/** Lê a preferência salva; armazenamento bloqueado (aba privada, política do navegador) não pode derrubar a aplicação. */
function lerModoSalvo(): ThemeMode {
  try {
    const stored = localStorage.getItem(storageKey)
    return stored === 'light' || stored === 'auto' || stored === 'dark' ? stored : 'dark'
  } catch {
    return 'dark'
  }
}

function salvarModo(mode: ThemeMode) {
  try {
    localStorage.setItem(storageKey, mode)
  } catch {
    // Sem armazenamento, a escolha vale só nesta visita.
  }
}

/** Mantém a cor da barra do navegador (`<meta name="theme-color">`) igual ao fundo do tema em uso. */
function sincronizarThemeColor() {
  const meta = document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!meta) return
  const fundo = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
  if (fundo) meta.setAttribute('content', fundo)
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setModeState] = useState<ThemeMode>(lerModoSalvo)

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark', 'light', 'auto')
    root.classList.add(mode)
    salvarModo(mode)
    sincronizarThemeColor()
    if (mode !== 'auto' || typeof window.matchMedia !== 'function') return
    const consulta = window.matchMedia('(prefers-color-scheme: dark)')
    consulta.addEventListener?.('change', sincronizarThemeColor)
    return () => consulta.removeEventListener?.('change', sincronizarThemeColor)
  }, [mode])

  const value = useMemo(
    () => ({ mode, setMode: (next: ThemeMode) => setModeState(next) }),
    [mode],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
