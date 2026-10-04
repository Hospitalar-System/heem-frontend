import { X } from 'lucide-react'
import { useEffect, useRef, type PropsWithChildren, type ReactNode } from 'react'

export function Modal({ title, description, onClose, children, busy = false }: PropsWithChildren<{ title: string; description?: string; onClose: () => void; busy?: boolean }>) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) closeRef.current() }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus() }
  }, [busy])

  return <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-black/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
    <section role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby={description ? 'modal-description' : undefined} className="w-full max-w-lg rounded-lg border border-border bg-surface shadow-2xl">
      <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4"><div><h2 id="modal-title" className="text-base font-semibold">{title}</h2>{description && <p id="modal-description" className="mt-1 text-xs text-text-secondary">{description}</p>}</div><button type="button" aria-label="Fechar" disabled={busy} onClick={onClose} className="grid size-8 shrink-0 place-items-center rounded-md text-text-secondary hover:bg-bg disabled:opacity-50"><X size={17} /></button></header>
      <div className="p-5">{children}</div>
    </section>
  </div>
}

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return <label className="block space-y-1.5 text-xs font-medium text-text-secondary"><span>{label}</span>{children}{error && <span role="alert" className="block text-xs text-danger">{error}</span>}</label>
}
