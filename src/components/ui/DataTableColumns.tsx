import { Columns3, RotateCcw } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import type { ToggleableColumn } from './useColumnVisibility'

/** Botão "Colunas": menu com caixas de seleção, "Restaurar padrão" e fechamento por Esc ou clique fora. */
export function ColumnsMenu({ columns, hidden, onToggle, onReset, isDefault }: {
  columns: ToggleableColumn[]
  hidden: Set<string>
  onToggle: (key: string) => void
  onReset: () => void
  isDefault: boolean
}) {
  const ids = useId()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const options = columns.filter((column) => !column.essential)

  useEffect(() => {
    if (!open) return undefined
    document.getElementById(`${ids}-menu`)?.querySelector<HTMLElement>('input')?.focus()
    const onDown = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false) }
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); buttonRef.current?.focus() } }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open, ids])

  if (options.length === 0) return null
  const hiddenCount = options.filter((column) => hidden.has(column.key)).length
  return <div ref={rootRef} className="relative">
    <button ref={buttonRef} type="button" aria-haspopup="dialog" aria-expanded={open} aria-controls={`${ids}-menu`} onClick={() => setOpen((value) => !value)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-text-primary outline-none hover:bg-bg focus-visible:ring-2 focus-visible:ring-primary">
      <Columns3 aria-hidden="true" size={14} />Colunas{hiddenCount > 0 ? <span className="text-text-secondary"> · {hiddenCount} {hiddenCount === 1 ? 'oculta' : 'ocultas'}</span> : null}
    </button>
    {open ? <div id={`${ids}-menu`} role="dialog" aria-label="Escolher colunas" className="absolute right-0 top-full z-30 mt-1 w-60 rounded-lg border border-border bg-surface p-2 shadow-lg">
      <fieldset className="grid gap-0.5">
        <legend className="px-2 pb-1 text-xs font-medium text-text-secondary">Colunas da tabela</legend>
        {options.map((column) => <label key={column.key} className="flex min-h-8 cursor-pointer items-center gap-2 rounded-md px-2 text-xs text-text-primary hover:bg-bg has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary">
          <input type="checkbox" checked={!hidden.has(column.key)} onChange={() => onToggle(column.key)} className="size-4 accent-primary" />
          {column.label}
        </label>)}
      </fieldset>
      <button type="button" aria-disabled={isDefault || undefined} onClick={() => { if (!isDefault) onReset() }} className={`mt-1 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-border text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary ${isDefault ? 'cursor-default text-text-secondary' : 'text-text-primary hover:bg-bg'}`}>
        <RotateCcw aria-hidden="true" size={13} />Restaurar padrão
      </button>
    </div> : null}
  </div>
}
