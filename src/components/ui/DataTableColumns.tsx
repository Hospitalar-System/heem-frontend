import { Check, Columns3, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { useFloatingPlacement } from './useFloatingPlacement'
import type { ToggleableColumn } from './useColumnVisibility'

const MENU_WIDTH = 240
const ITEM_HEIGHT = 36

/**
 * Botão "Colunas": mesmo padrão do menu de ações das linhas (painel em portal, `rounded-lg border bg-surface p-1.5 shadow-xl`,
 * itens `px-3 py-2 text-xs`, item ativo com `bg-surface-hi`). Itens são `menuitemcheckbox` com a mesma caixa marcável do
 * Checkbox do sistema; setas, Home/End, Espaço/Enter marcam sem fechar; Esc e clique fora fecham e devolvem o foco ao botão.
 */
export function ColumnsMenu({ columns, hidden, onToggle, onReset, isDefault }: {
  columns: ToggleableColumn[]
  hidden: Set<string>
  onToggle: (key: string) => void
  onReset: () => void
  isDefault: boolean
}) {
  const menuId = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const options = columns.filter((column) => !column.essential)
  const itemCount = options.length + 1 // + "Restaurar padrão"
  const placement = useFloatingPlacement(open, buttonRef, itemCount * ITEM_HEIGHT + 48, 380)

  const close = useCallback((restoreFocus = true) => {
    setOpen(false)
    if (restoreFocus) buttonRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return undefined
    setActive(0)
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (open && placement) menuRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.focus()
  }, [open, placement, active])

  if (options.length === 0) return null
  const hiddenCount = options.filter((column) => hidden.has(column.key)).length

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); close(); return }
    if (event.key === 'Tab') { close(false); return }
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive((index) => (index + 1) % itemCount) }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((index) => (index - 1 + itemCount) % itemCount) }
    else if (event.key === 'Home') { event.preventDefault(); setActive(0) }
    else if (event.key === 'End') { event.preventDefault(); setActive(itemCount - 1) }
  }

  const itemBase = 'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-text-primary outline-none'
  const left = Math.max(8, Math.min((buttonRef.current?.getBoundingClientRect().right ?? MENU_WIDTH) - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8))

  return <>
    <button ref={buttonRef} type="button" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined} onClick={() => (open ? close() : setOpen(true))} className={`inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs font-medium text-text-primary outline-none transition-colors hover:bg-bg focus-visible:ring-2 focus-visible:ring-primary ${open ? 'bg-bg' : ''}`}>
      <Columns3 aria-hidden="true" size={14} className="text-text-secondary" />Colunas{hiddenCount > 0 ? <span className="text-text-secondary"> · {hiddenCount} {hiddenCount === 1 ? 'oculta' : 'ocultas'}</span> : null}
    </button>
    {open && placement ? createPortal(
      <div
        ref={menuRef}
        id={menuId}
        role="menu"
        aria-label="Colunas da tabela"
        onKeyDown={onMenuKeyDown}
        style={{ position: 'fixed', left, width: MENU_WIDTH, top: placement.top, bottom: placement.bottom, maxHeight: placement.maxHeight }}
        className="z-[80] overflow-auto rounded-lg border border-border bg-surface p-1.5 text-text-primary shadow-xl"
      >
        <p className="px-3 pb-1 pt-1 text-xs font-medium text-text-secondary">Colunas da tabela</p>
        {options.map((column, index) => {
          const checked = !hidden.has(column.key)
          return <button
            key={column.key}
            type="button"
            role="menuitemcheckbox"
            aria-checked={checked}
            data-index={index}
            tabIndex={active === index ? 0 : -1}
            onMouseMove={() => { if (active !== index) setActive(index) }}
            onClick={() => onToggle(column.key)}
            className={`${itemBase} cursor-pointer ${active === index ? 'bg-surface-hi' : ''}`}
          >
            <span aria-hidden="true" className={`relative inline-grid size-4 shrink-0 place-items-center rounded-[4px] border ${checked ? 'border-primary bg-primary' : 'border-text-muted bg-bg'}`}>
              {checked ? <Check strokeWidth={3} size={12} className="text-bg-brand" /> : null}
            </span>
            <span className="min-w-0 flex-1 truncate">{column.label}</span>
          </button>
        })}
        <div role="separator" className="my-1 h-px bg-border" />
        <button
          type="button"
          role="menuitem"
          data-index={options.length}
          tabIndex={active === options.length ? 0 : -1}
          aria-disabled={isDefault || undefined}
          onMouseMove={() => { if (active !== options.length) setActive(options.length) }}
          onClick={() => { if (!isDefault) onReset() }}
          className={`${itemBase} ${isDefault ? 'cursor-default text-text-secondary' : 'cursor-pointer'} ${active === options.length ? 'bg-surface-hi' : ''}`}
        >
          <RotateCcw aria-hidden="true" size={14} className="shrink-0 text-text-secondary" />
          <span className="min-w-0 flex-1 truncate">Restaurar padrão</span>
        </button>
      </div>,
      document.body,
    ) : null}
  </>
}
