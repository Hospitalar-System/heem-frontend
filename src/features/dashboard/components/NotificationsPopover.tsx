import { Bell } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export function NotificationsPopover() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Notificações"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="grid size-[38px] place-items-center rounded-md border border-border bg-surface text-text-secondary outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Bell aria-hidden="true" size={15} />
      </button>

      {open && (
        <section
          role="dialog"
          aria-labelledby="notifications-title"
          className="absolute right-0 top-[calc(100%+10px)] z-40 w-[min(26rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-surface shadow-xl"
        >
          <header className="flex h-12 items-center justify-start border-b border-border px-4">
            <h2 id="notifications-title" className="text-sm font-semibold text-text-primary">Notificações</h2>
          </header>
          <div className="grid min-h-48 place-items-center px-6 py-8 text-center">
            <div className="flex max-w-xs flex-col items-center">
              <span className="mb-3 grid size-10 place-items-center rounded-full bg-bg text-text-muted">
                <Bell aria-hidden="true" size={18} />
              </span>
              <p className="text-sm font-medium text-text-primary">Notificações indisponíveis</p>
              <p className="mt-1 text-xs leading-5 text-text-secondary">Este recurso ainda não está disponível.</p>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
