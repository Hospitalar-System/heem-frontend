import { Monitor, Moon, Sun } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useTheme } from './use-theme'
import type { ThemeMode } from './theme-mode'

const options: { mode: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { mode: 'light', label: 'Claro', Icon: Sun },
  { mode: 'dark', label: 'Escuro', Icon: Moon },
  { mode: 'auto', label: 'Automático', Icon: Monitor },
]

export function ThemeSwitcher() {
  const { mode, setMode } = useTheme()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const activeOption = options.find((option) => option.mode === mode) ?? options[1]
  const ActiveIcon = activeOption.Icon

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    optionRefs.current[options.findIndex((option) => option.mode === mode)]?.focus()
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [mode, open])

  function openMenu() {
    setOpen(true)
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const currentIndex = optionRefs.current.findIndex((option) => option === document.activeElement)
    let nextIndex: number | undefined
    if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % options.length
    if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + options.length) % options.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = options.length - 1
    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
    }
    if (nextIndex !== undefined) {
      event.preventDefault()
      optionRefs.current[nextIndex]?.focus()
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Selecionar tema"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            openMenu()
          }
        }}
        className="grid size-8 place-items-center rounded-md text-text-primary outline-none transition hover:bg-surface focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ActiveIcon aria-hidden="true" size={17} strokeWidth={1.8} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Tema da interface"
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 top-[calc(100%+4px)] z-50 w-48 rounded-md border border-border bg-surface p-1 shadow-lg"
        >
          {options.map(({ mode: optionMode, label, Icon }, index) => (
            <button
              key={optionMode}
              ref={(element) => { optionRefs.current[index] = element }}
              type="button"
              role="menuitemradio"
              aria-checked={mode === optionMode}
              tabIndex={mode === optionMode ? 0 : -1}
              onClick={() => {
                setMode(optionMode)
                setOpen(false)
                triggerRef.current?.focus()
              }}
              className={`flex min-h-9 w-full items-center gap-2.5 rounded px-2 text-left text-sm text-text-primary outline-none transition focus-visible:ring-2 focus-visible:ring-primary ${mode === optionMode ? 'bg-bg' : 'hover:bg-bg/70'}`}
            >
              <Icon aria-hidden="true" size={16} strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
