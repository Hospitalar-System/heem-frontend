import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { useFloatingPlacement } from './useFloatingPlacement'

export type SelectOption = { value: string; label: string; disabled?: boolean }

export type SelectProps = {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  id?: string
  name?: string
  required?: boolean
  size?: 'md' | 'sm'
  className?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  onBlur?: () => void
}

const LIST_MAX = 256

/**
 * Select compartilhado (padrão ARIA "select-only combobox").
 * O foco fica sempre no botão; a lista é renderizada num portal com posição fixa
 * para não ser cortada por modais ou tabelas com overflow.
 * Em formulários React Hook Form use `FormSelect` (Controller).
 */
export function Select({
  value, onChange, options, placeholder = 'Selecione', disabled = false, id, name, required = false, size = 'md', className = '', onBlur,
  'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy, 'aria-invalid': ariaInvalid, 'aria-describedby': ariaDescribedBy,
}: SelectProps) {
  const autoId = useId()
  const listId = `${autoId}-list`
  const optionId = (index: number) => `${autoId}-opt-${index}`
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const typeahead = useRef({ text: '', timer: 0 as number | undefined })
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)

  const selectedIndex = useMemo(() => options.findIndex((option) => option.value === value), [options, value])
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined
  const isEmptyValue = !selected || selected.value === ''

  const enabledIndexes = useMemo(() => options.map((option, index) => (option.disabled ? -1 : index)).filter((index) => index >= 0), [options])

  const placement = useFloatingPlacement(open, buttonRef, Math.min(LIST_MAX, options.length * 40 + 12), LIST_MAX)

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (buttonRef.current?.contains(target) || listRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (!open || active < 0) return
    document.getElementById(optionId(active))?.scrollIntoView?.({ block: 'nearest' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, open])

  useEffect(() => () => window.clearTimeout(typeahead.current.timer), [])

  const openList = (preferred?: number) => {
    if (disabled) return
    const start = preferred ?? (selectedIndex >= 0 && !options[selectedIndex].disabled ? selectedIndex : enabledIndexes[0] ?? -1)
    setActive(start)
    setOpen(true)
  }
  const close = (restoreFocus = true) => {
    setOpen(false)
    if (restoreFocus) buttonRef.current?.focus()
  }
  const choose = (index: number) => {
    const option = options[index]
    if (!option || option.disabled) return
    if (option.value !== value) onChange(option.value)
    close()
  }
  const move = (delta: 1 | -1) => {
    if (!enabledIndexes.length) return
    const position = enabledIndexes.indexOf(active)
    const next = position < 0 ? (delta === 1 ? 0 : enabledIndexes.length - 1) : Math.min(enabledIndexes.length - 1, Math.max(0, position + delta))
    setActive(enabledIndexes[next])
  }
  const jumpByText = (char: string) => {
    const state = typeahead.current
    window.clearTimeout(state.timer)
    state.text += char.toLowerCase()
    state.timer = window.setTimeout(() => { state.text = '' }, 600)
    const fromCurrent = enabledIndexes.filter((index) => index > active).concat(enabledIndexes.filter((index) => index <= active))
    const repeated = state.text.length > 1 && state.text.split('').every((c) => c === state.text[0])
    const needle = repeated ? state.text[0] : state.text
    const candidates = repeated ? fromCurrent : [active, ...fromCurrent].filter((index, i, all) => index >= 0 && all.indexOf(index) === i)
    const found = candidates.find((index) => options[index].label.toLowerCase().startsWith(needle))
    if (found === undefined) return
    if (open) setActive(found)
    else onChange(options[found].value)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return
    const { key } = event
    if (!open) {
      if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ') {
        event.preventDefault()
        openList()
      } else if (key === 'Home' || key === 'End') {
        event.preventDefault()
        openList(key === 'Home' ? enabledIndexes[0] : enabledIndexes[enabledIndexes.length - 1])
      } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        jumpByText(key)
      }
      return
    }
    if (key === 'ArrowDown') { event.preventDefault(); move(1) }
    else if (key === 'ArrowUp') { event.preventDefault(); move(-1) }
    else if (key === 'Home') { event.preventDefault(); setActive(enabledIndexes[0] ?? -1) }
    else if (key === 'End') { event.preventDefault(); setActive(enabledIndexes[enabledIndexes.length - 1] ?? -1) }
    else if (key === 'Enter' || key === ' ') { event.preventDefault(); if (active >= 0) choose(active); else close() }
    else if (key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() }
    else if (key === 'Tab') setOpen(false)
    else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) { event.preventDefault(); jumpByText(key) }
  }

  const height = size === 'sm' ? 'h-9 text-xs' : 'h-10 text-sm'
  const border = ariaInvalid ? 'border-danger' : open ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-text-secondary'
  const labelProps = ariaLabel ? { 'aria-label': ariaLabel } : ariaLabelledBy ? { 'aria-labelledby': ariaLabelledBy } : {}

  return <>
    <button
      ref={buttonRef}
      id={id}
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={open ? listId : undefined}
      aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
      aria-invalid={ariaInvalid || undefined}
      aria-required={required || undefined}
      aria-describedby={ariaDescribedBy}
      disabled={disabled}
      onClick={() => (open ? close() : openList())}
      onKeyDown={onKeyDown}
      onBlur={() => { if (!open) onBlur?.() }}
      {...labelProps}
      className={`flex w-full items-center justify-between gap-2 rounded-md border bg-bg px-3 text-left font-normal text-text-primary outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 ${height} ${border} ${className}`}
    >
      <span className={`min-w-0 flex-1 truncate ${isEmptyValue ? 'text-text-muted' : ''}`}>{selected ? selected.label : placeholder}</span>
      <ChevronDown aria-hidden size={16} className={`shrink-0 text-text-secondary transition-transform ${open ? 'rotate-180 text-primary' : ''}`} />
    </button>
    {name && <input type="hidden" name={name} value={value} />}
    {required && <RequiredProxy value={value} onFocus={() => buttonRef.current?.focus()} />}
    {open && placement && createPortal(
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : ariaLabelledBy}
        tabIndex={-1}
        onMouseDown={(event) => event.preventDefault()}
        style={{ position: 'fixed', left: placement.left, minWidth: placement.width, top: placement.top, bottom: placement.bottom, maxHeight: placement.maxHeight }}
        className="z-[80] m-0 overflow-auto rounded-lg border border-border bg-surface p-1.5 text-sm text-text-primary shadow-xl list-none"
      >
        {options.map((option, index) => {
          const isSelected = option.value === value
          return <li
            key={`${option.value}-${index}`}
            id={optionId(index)}
            role="option"
            aria-selected={isSelected}
            aria-disabled={option.disabled || undefined}
            onClick={() => choose(index)}
            onMouseMove={() => { if (!option.disabled && active !== index) setActive(index) }}
            className={`flex items-center justify-between gap-3 rounded-md px-3 py-2 ${option.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${active === index ? 'bg-surface-hi' : ''} ${isSelected ? 'font-semibold text-primary' : option.value === '' ? 'text-text-muted' : ''}`}
          >
            <span className="min-w-0 truncate">{option.label}</span>
            {isSelected && <Check aria-hidden size={15} className="shrink-0" />}
          </li>
        })}
      </ul>,
      document.body,
    )}
  </>
}

/** Campo invisível que mantém a validação nativa de `required` em formulários sem RHF. */
function RequiredProxy({ value, onFocus }: { value: string; onFocus: () => void }) {
  return <input aria-hidden tabIndex={-1} required value={value} onChange={() => {}} onFocus={onFocus} className="pointer-events-none absolute h-0 w-0 opacity-0" />
}
