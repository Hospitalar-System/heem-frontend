import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { addDays, addMonths, daysInMonth, formatBr, isoOf, keyOf, longLabel, monthName, parseDate, todayCivil, weekday, type CivilDate } from './civil-date'
import { useFloatingPlacement } from './useFloatingPlacement'

export type DatePickerProps = {
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
  disabled?: boolean
  required?: boolean
  id?: string
  name?: string
  placeholder?: string
  size?: 'md' | 'sm'
  className?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  onBlur?: () => void
}

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const POPOVER_WIDTH = 288
/**
 * Seletor de data (padrão ARIA dialog + grid). Valor 'YYYY-MM-DD' ou ''.
 * Em formulários React Hook Form use `FormDatePicker`.
 */
export function DatePicker({
  value, onChange, min, max, disabled = false, required = false, id, name, placeholder = 'dd/mm/aaaa', size = 'md', className = '', onBlur,
  'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy, 'aria-invalid': ariaInvalid, 'aria-describedby': ariaDescribedBy,
}: DatePickerProps) {
  const autoId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const current = parseDate(value)
  const minDate = parseDate(min)
  const maxDate = parseDate(max)
  const [open, setOpen] = useState(false)
  const [focusDay, setFocusDay] = useState<CivilDate>(todayCivil())
  const [view, setView] = useState({ y: focusDay.y, m: focusDay.m })
  const placement = useFloatingPlacement(open, triggerRef, 340, 400, 280, POPOVER_WIDTH)

  const isDisabled = (date: CivilDate) => (minDate !== null && keyOf(date) < keyOf(minDate)) || (maxDate !== null && keyOf(date) > keyOf(maxDate))
  const clamp = (date: CivilDate) => (minDate && keyOf(date) < keyOf(minDate) ? minDate : maxDate && keyOf(date) > keyOf(maxDate) ? maxDate : date)

  const goTo = (date: CivilDate) => { setFocusDay(date); setView({ y: date.y, m: date.m }) }
  const openPicker = () => {
    if (disabled) return
    goTo(current ?? clamp(todayCivil()))
    setOpen(true)
  }
  const close = (restoreFocus = true) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }
  const pick = (date: CivilDate) => {
    if (isDisabled(date)) return
    onChange(isoOf(date))
    close()
  }

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Foco real no dia ativo quando o usuário navega pelo teclado dentro da grade.
  const [keyboardNav, setKeyboardNav] = useState(false)
  useEffect(() => {
    if (!open || !placement) return
    const cell = popoverRef.current?.querySelector<HTMLElement>(`[data-day="${isoOf(focusDay)}"]`)
    if (cell && (keyboardNav || !popoverRef.current?.contains(document.activeElement))) cell.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, placement, focusDay.y, focusDay.m, focusDay.d])

  const weeks = useMemo(() => {
    const first: CivilDate = { y: view.y, m: view.m, d: 1 }
    const lead = weekday(first)
    const total = Math.ceil((lead + daysInMonth(view.y, view.m)) / 7) * 7
    const cells: CivilDate[] = []
    for (let i = 0; i < total; i += 1) cells.push(addDays(first, i - lead))
    return Array.from({ length: total / 7 }, (_, row) => cells.slice(row * 7, row * 7 + 7))
  }, [view.y, view.m])

  const onGridKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const move = (next: CivilDate) => { event.preventDefault(); setKeyboardNav(true); goTo(next) }
    switch (event.key) {
      case 'ArrowLeft': move(addDays(focusDay, -1)); break
      case 'ArrowRight': move(addDays(focusDay, 1)); break
      case 'ArrowUp': move(addDays(focusDay, -7)); break
      case 'ArrowDown': move(addDays(focusDay, 7)); break
      case 'Home': move(addDays(focusDay, -weekday(focusDay))); break
      case 'End': move(addDays(focusDay, 6 - weekday(focusDay))); break
      case 'PageUp': move(addMonths(focusDay, event.shiftKey ? -12 : -1)); break
      case 'PageDown': move(addMonths(focusDay, event.shiftKey ? 12 : 1)); break
      case 'Enter':
      case ' ': event.preventDefault(); pick(focusDay); break
      default:
    }
  }

  const onPopoverKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close()
    } else if (event.key === 'Tab') {
      // Mantém o foco dentro do popover (o Modal ao redor tem seu próprio trap).
      event.stopPropagation()
      const items = Array.from(popoverRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [role="gridcell"] [tabindex="0"]') ?? [])
      if (!items.length) return
      const index = items.indexOf(document.activeElement as HTMLElement)
      const next = event.shiftKey ? (index <= 0 ? items.length - 1 : index - 1) : (index === items.length - 1 ? 0 : index + 1)
      event.preventDefault()
      items[next].focus()
    }
  }

  const height = size === 'sm' ? 'h-9 text-xs' : 'h-10 text-sm'
  const border = ariaInvalid ? 'border-danger' : open ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-text-secondary'
  const labelProps = ariaLabel ? { 'aria-label': ariaLabel } : ariaLabelledBy ? { 'aria-labelledby': ariaLabelledBy } : {}
  const todayDate = todayCivil()
  const nav = 'grid size-8 place-items-center rounded-md text-text-secondary hover:bg-surface-hi focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40'

  return <>
    <button
      ref={triggerRef}
      id={id}
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={open ? `${autoId}-dialog` : undefined}
      aria-invalid={ariaInvalid || undefined}
      aria-required={required || undefined}
      aria-describedby={ariaDescribedBy}
      disabled={disabled}
      onClick={() => (open ? close() : openPicker())}
      onBlur={() => { if (!open) onBlur?.() }}
      {...labelProps}
      className={`flex w-full items-center justify-between gap-2 rounded-md border bg-bg px-3 text-left font-normal text-text-primary outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 ${height} ${border} ${className}`}
    >
      <span className={`min-w-0 flex-1 truncate ${current ? '' : 'text-text-muted'}`}>{current ? formatBr(current) : placeholder}</span>
      <CalendarDays aria-hidden size={16} className={`shrink-0 ${open ? 'text-primary' : 'text-text-secondary'}`} />
    </button>
    {name && <input type="hidden" name={name} value={value} />}
    {required && <input aria-hidden tabIndex={-1} required value={value} onChange={() => {}} onFocus={() => triggerRef.current?.focus()} className="pointer-events-none absolute h-0 w-0 opacity-0" />}
    {open && placement && createPortal(
      <div
        ref={popoverRef}
        id={`${autoId}-dialog`}
        role="dialog"
        aria-label="Escolher data"
        onKeyDown={onPopoverKeyDown}
        onMouseDown={(event) => { if ((event.target as HTMLElement).closest('button') === null) event.preventDefault() }}
        style={{ position: 'fixed', left: placement.left, top: placement.top, bottom: placement.bottom, width: POPOVER_WIDTH }}
        className="z-[80] rounded-lg border border-border bg-surface p-3 text-sm text-text-primary shadow-xl"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <button type="button" aria-label="Mês anterior" onClick={() => { setKeyboardNav(false); setView((v) => { const p = addMonths({ ...v, d: 1 }, -1); return { y: p.y, m: p.m } }) }} className={nav}><ChevronLeft aria-hidden size={16} /></button>
          <div data-testid="datepicker-title" aria-live="polite" className="text-sm font-semibold capitalize">{monthName(view.m)} de {view.y}</div>
          <button type="button" aria-label="Próximo mês" onClick={() => { setKeyboardNav(false); setView((v) => { const n = addMonths({ ...v, d: 1 }, 1); return { y: n.y, m: n.m } }) }} className={nav}><ChevronRight aria-hidden size={16} /></button>
        </div>
        <div role="grid" aria-label={`${monthName(view.m)} de ${view.y}`} onKeyDown={onGridKeyDown}>
          <div role="row" className="grid grid-cols-7 text-center text-[11px] font-medium text-text-muted">
            {WEEKDAYS.map((day) => <div key={day} role="columnheader" className="py-1">{day}</div>)}
          </div>
          {weeks.map((week) => <div key={isoOf(week[0])} role="row" className="grid grid-cols-7">
            {week.map((date) => {
              const outside = date.m !== view.m
              const selected = current !== null && keyOf(current) === keyOf(date)
              const blocked = isDisabled(date)
              const isToday = keyOf(date) === keyOf(todayDate)
              const isFocus = keyOf(date) === keyOf(focusDay)
              return <div key={isoOf(date)} role="gridcell" aria-selected={selected} className="p-0.5">
                <button
                  type="button"
                  data-day={isoOf(date)}
                  tabIndex={isFocus ? 0 : -1}
                  aria-label={longLabel(date)}
                  aria-disabled={blocked || undefined}
                  aria-current={isToday ? 'date' : undefined}
                  onClick={() => pick(date)}
                  className={`grid h-9 w-full place-items-center rounded-md text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    selected ? 'bg-primary font-semibold text-bg-brand'
                      : blocked ? 'cursor-not-allowed text-text-muted opacity-40'
                        : `hover:bg-surface-hi ${outside ? 'text-text-muted' : 'text-text-primary'} ${isToday ? 'border border-primary font-semibold text-primary' : ''}`}`}
                >{date.d}</button>
              </div>
            })}
          </div>)}
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
          <button type="button" onClick={() => { if (!isDisabled(todayDate)) pick(todayDate); else goTo(clamp(todayDate)) }} className="h-8 rounded-md px-2 text-xs font-medium text-primary hover:bg-surface-hi focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Hoje</button>
          {!required && <button type="button" onClick={() => { onChange(''); close() }} className="h-8 rounded-md px-2 text-xs font-medium text-text-secondary hover:bg-surface-hi focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Limpar</button>}
        </div>
      </div>,
      document.body,
    )}
  </>
}
