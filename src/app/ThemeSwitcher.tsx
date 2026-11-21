import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTheme } from './use-theme'

/** Tema que está sendo mostrado agora: o modo "auto" (valor antigo salvo) vale o tema do sistema operacional. */
function useResolvedTheme(): 'dark' | 'light' {
  const { mode } = useTheme()
  const [systemDark, setSystemDark] = useState(() => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  useEffect(() => {
    if (mode !== 'auto' || typeof window.matchMedia !== 'function') return undefined
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => setSystemDark(query.matches)
    sync()
    query.addEventListener?.('change', sync)
    return () => query.removeEventListener?.('change', sync)
  }, [mode])
  return mode === 'auto' ? (systemDark ? 'dark' : 'light') : mode
}

/**
 * A troca de tema é instantânea: por 2 quadros o <html> recebe data-theme-switching, que desliga as transições de cor
 * do resto da página (sem cor intermediária nem piscar). Só o ícone (svg[data-icon]) segue animando.
 */
function pauseTransitions() {
  const root = document.documentElement
  root.setAttribute('data-theme-switching', '')
  requestAnimationFrame(() => requestAnimationFrame(() => root.removeAttribute('data-theme-switching')))
}

// Só transform e opacity, 250 ms: o sol sai girando para -90° e a lua entra de +90°. Com prefers-reduced-motion não há giro nem escala, só um fade curto.
const iconBase = 'absolute inset-0 m-auto transition-[transform,opacity] duration-[250ms] ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:rotate-0 motion-reduce:scale-100 motion-reduce:duration-100'
const shown = 'rotate-0 scale-100 opacity-100'

const variants = {
  /** Painel e login: mesmo tamanho, raio e borda do sino de notificações (38 px). */
  panel: 'size-[38px] rounded-md border border-border bg-surface',
  /** Landing: redondo, borda fina e sem fundo, no estilo do botão "Entrar". */
  landing: 'size-11 rounded-full border border-border bg-transparent hover:border-text-secondary',
} as const

/**
 * Botão único de tema: alterna claro/escuro (sol ↔ lua). O rótulo diz a ação, o ícone anima só com transform/opacity e
 * em ponteiro grosso o alvo vai a 44 px.
 */
export function ThemeSwitcher({ variant = 'panel' }: { variant?: keyof typeof variants }) {
  const { setMode } = useTheme()
  const theme = useResolvedTheme()
  const dark = theme === 'dark'
  return (
    <button
      type="button"
      aria-label={dark ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'}
      onClick={() => { pauseTransitions(); setMode(dark ? 'light' : 'dark') }}
      className={`relative grid shrink-0 place-items-center text-text-secondary outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg [@media(pointer:coarse)]:size-11 ${variants[variant]}`}
    >
      <span aria-hidden="true" className="relative block size-[18px]">
        <Sun size={18} strokeWidth={1.8} data-icon="sun" className={`${iconBase} ${dark ? '-rotate-90 scale-50 opacity-0' : shown}`} />
        <Moon size={18} strokeWidth={1.8} data-icon="moon" className={`${iconBase} ${dark ? shown : 'rotate-90 scale-50 opacity-0'}`} />
      </span>
    </button>
  )
}
