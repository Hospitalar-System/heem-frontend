import { MoreVertical } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Modal } from './Modal'
import { useFloatingPlacement } from './useFloatingPlacement'

export type RowActionConfirm = {
  title: string
  description?: string
  /** Texto do botão de confirmação (padrão: rótulo do item). */
  confirmLabel?: string
  cancelLabel?: string
}

export type RowAction = {
  label: string
  icon?: ReactNode
  /** Ação ao escolher o item. Se retornar uma Promise, a confirmação fica ocupada até concluir. */
  onSelect?: () => void | Promise<unknown>
  /** Navegação: renderiza o item como link. */
  to?: string
  disabled?: boolean
  /** Tom de perigo (ação irreversível ou que remove acesso). */
  destructive?: boolean
  /** Abre um diálogo de confirmação antes de executar `onSelect`. */
  confirm?: RowActionConfirm
}

export type RowActionsMenuProps = {
  /** Nome da linha: o botão recebe o nome acessível "Ações de <label>". */
  label: string
  actions: RowAction[]
  disabled?: boolean
  className?: string
}

const MENU_WIDTH = 224
const ITEM_HEIGHT = 36

/**
 * Menu de ações por linha (kebab de três pontos). Padrão ARIA "menu button": o foco vai para os
 * itens (roving), setas/Home/End navegam, Esc fecha e devolve o foco, Tab fecha. A lista fica
 * num portal com posição fixa para não ser cortada por tabelas com overflow.
 */
export function RowActionsMenu({ label, actions, disabled = false, className = '' }: RowActionsMenuProps) {
  const autoId = useId()
  const menuId = `${autoId}-menu`
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const typeahead = useRef({ text: '', timer: 0 as number | undefined })
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [pending, setPending] = useState<RowAction | null>(null)
  const [busy, setBusy] = useState(false)
  const cancelRef = useRef<HTMLButtonElement>(null)

  const enabled = useMemo(() => actions.map((action, index) => (action.disabled ? -1 : index)).filter((index) => index >= 0), [actions])
  const placement = useFloatingPlacement(open, buttonRef, actions.length * ITEM_HEIGHT + 12, 320)

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (open && active >= 0) menuRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.focus()
  }, [open, active, placement])

  useEffect(() => () => window.clearTimeout(typeahead.current.timer), [])

  // Foco inicial no "Cancelar" (ação segura), depois de o Modal registrar o foco anterior para restaurá-lo ao fechar.
  useEffect(() => {
    if (pending) queueMicrotask(() => cancelRef.current?.focus())
  }, [pending])

  const openMenu = (preferred?: number) => {
    if (disabled || !enabled.length) return
    setActive(preferred ?? enabled[0])
    setOpen(true)
  }
  const close = (restoreFocus = true) => {
    setOpen(false)
    setActive(-1)
    if (restoreFocus) buttonRef.current?.focus()
  }
  const move = (delta: 1 | -1) => {
    const position = enabled.indexOf(active)
    const next = position < 0 ? 0 : (position + delta + enabled.length) % enabled.length
    setActive(enabled[next])
  }
  const jumpByText = (char: string) => {
    const state = typeahead.current
    window.clearTimeout(state.timer)
    state.text += char.toLowerCase()
    state.timer = window.setTimeout(() => { state.text = '' }, 600)
    const ordered = enabled.filter((index) => index > active).concat(enabled.filter((index) => index <= active))
    const found = ordered.find((index) => actions[index].label.toLowerCase().startsWith(state.text))
    if (found !== undefined) setActive(found)
  }

  const run = async (action: RowAction) => {
    setBusy(true)
    try { await action.onSelect?.() } finally { setBusy(false); setPending(null) }
  }
  const choose = (index: number) => {
    const action = actions[index]
    if (!action || action.disabled) return
    if (action.confirm) {
      // O foco volta ao botão antes do diálogo abrir: o Modal o restaura ao fechar.
      close()
      setPending(action)
    } else {
      close(!action.to)
      void run(action)
    }
  }

  const onButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      openMenu(event.key === 'ArrowDown' ? enabled[0] : enabled[enabled.length - 1])
    }
  }

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const { key } = event
    if (key === 'ArrowDown') { event.preventDefault(); move(1) }
    else if (key === 'ArrowUp') { event.preventDefault(); move(-1) }
    else if (key === 'Home') { event.preventDefault(); setActive(enabled[0] ?? -1) }
    else if (key === 'End') { event.preventDefault(); setActive(enabled[enabled.length - 1] ?? -1) }
    else if (key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() }
    else if (key === 'Tab') close(false)
    else if (key === 'Enter' || key === ' ') {
      event.preventDefault()
      if (active >= 0) choose(active)
    } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) { event.preventDefault(); jumpByText(key) }
  }

  const itemClass = (action: RowAction, index: number) => `flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs outline-none ${action.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${action.destructive ? 'text-danger' : 'text-text-primary'} ${active === index && !action.disabled ? 'bg-surface-hi' : ''}`

  return <>
    <button
      ref={buttonRef}
      type="button"
      aria-label={`Ações de ${label}`}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={open ? menuId : undefined}
      disabled={disabled}
      onClick={() => (open ? close() : openMenu())}
      onKeyDown={onButtonKeyDown}
      className={`grid size-8 place-items-center rounded-md text-text-secondary outline-none transition-colors hover:bg-bg hover:text-text-primary focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 ${open ? 'bg-bg text-text-primary' : ''} ${className}`}
    ><MoreVertical aria-hidden size={16} /></button>
    {open && placement && createPortal(
      <div
        ref={menuRef}
        id={menuId}
        role="menu"
        aria-label={`Ações de ${label}`}
        onKeyDown={onMenuKeyDown}
        style={{ position: 'fixed', left: Math.max(8, (buttonRef.current?.getBoundingClientRect().right ?? MENU_WIDTH) - MENU_WIDTH), width: MENU_WIDTH, top: placement.top, bottom: placement.bottom, maxHeight: placement.maxHeight }}
        className="z-[80] overflow-auto rounded-lg border border-border bg-surface p-1.5 text-text-primary shadow-xl"
      >
        {actions.map((action, index) => {
          const content = <>{action.icon ? <span aria-hidden className="grid size-4 shrink-0 place-items-center">{action.icon}</span> : null}<span className="min-w-0 flex-1 truncate">{action.label}</span></>
          const common = {
            role: 'menuitem' as const,
            tabIndex: active === index ? 0 : -1,
            'data-index': index,
            'aria-disabled': action.disabled || undefined,
            onMouseMove: () => { if (!action.disabled && active !== index) setActive(index) },
            className: itemClass(action, index),
          }
          return action.to && !action.disabled
            ? <Link key={`${action.label}-${index}`} to={action.to} {...common} onClick={() => close(false)}>{content}</Link>
            : <button key={`${action.label}-${index}`} type="button" {...common} onClick={() => choose(index)}>{content}</button>
        })}
      </div>,
      document.body,
    )}
    {pending?.confirm ? <Modal title={pending.confirm.title} description={pending.confirm.description} busy={busy} onClose={() => setPending(null)}>
      <div className="flex justify-end gap-2">
        <button ref={cancelRef} type="button" disabled={busy} onClick={() => setPending(null)} className="h-9 rounded-md border border-border px-3 text-xs">{pending.confirm.cancelLabel ?? 'Cancelar'}</button>
        <button type="button" disabled={busy} onClick={() => void run(pending)} className={`h-9 rounded-md px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${pending.destructive ? 'bg-danger text-white' : 'bg-primary text-bg-brand'}`}>{pending.confirm.confirmLabel ?? pending.label}</button>
      </div>
    </Modal> : null}
  </>
}
