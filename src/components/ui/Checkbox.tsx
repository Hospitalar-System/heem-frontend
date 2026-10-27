import { Check, Minus } from 'lucide-react'
import { forwardRef, useCallback, useEffect, useId, useRef, type ChangeEvent, type InputHTMLAttributes, type ReactNode } from 'react'

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> & {
  /** Rótulo visível integrado (clicável). Sem ele, informe `aria-label` ou envolva num <label>. */
  label?: ReactNode
  /** Texto de apoio exibido abaixo do rótulo e associado via aria-describedby. */
  description?: ReactNode
  /** Estado misto (ex.: "selecionar todos" parcial): aria-checked="mixed". */
  indeterminate?: boolean
  /** Estado de erro (borda danger e aria-invalid). */
  invalid?: boolean
  /** Atalho para uso controlado: recebe o novo valor marcado. */
  onCheckedChange?: (checked: boolean) => void
  /** Classes extras para o contêiner (rótulo + caixa). */
  containerClassName?: string
}

/**
 * Checkbox compartilhado: `<input type="checkbox">` real (teclado/Espaço e leitores de tela nativos)
 * estilizado com tokens do tema. Compatível com React Hook Form (`{...register('campo')}`) e com uso controlado.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, description, indeterminate = false, invalid = false, onCheckedChange, onChange, id, className = '', containerClassName = '', disabled, 'aria-describedby': describedBy, 'aria-invalid': ariaInvalid, ...rest },
  forwardedRef,
) {
  const autoId = useId()
  const inputId = id ?? `${autoId}-checkbox`
  const descriptionId = `${autoId}-description`
  const innerRef = useRef<HTMLInputElement | null>(null)

  const setRef = useCallback((node: HTMLInputElement | null) => {
    innerRef.current = node
    if (node) node.indeterminate = indeterminate
    if (typeof forwardedRef === 'function') forwardedRef(node)
    else if (forwardedRef) forwardedRef.current = node
  }, [forwardedRef, indeterminate])

  useEffect(() => {
    if (innerRef.current) innerRef.current.indeterminate = indeterminate
  })

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (innerRef.current) innerRef.current.indeterminate = false
    onChange?.(event)
    onCheckedChange?.(event.target.checked)
  }

  const describedByIds = [describedBy, description ? descriptionId : undefined].filter(Boolean).join(' ') || undefined
  const isInvalid = invalid || ariaInvalid === true || ariaInvalid === 'true'

  const box = <span className="relative mt-px inline-grid size-4 shrink-0 place-items-center">
    <input
      {...rest}
      ref={setRef}
      id={inputId}
      type="checkbox"
      disabled={disabled}
      onChange={handleChange}
      aria-checked={indeterminate ? 'mixed' : undefined}
      aria-invalid={isInvalid || undefined}
      aria-describedby={describedByIds}
      className={`peer m-0 size-4 cursor-pointer appearance-none rounded border bg-bg outline-none transition-colors checked:border-primary checked:bg-primary indeterminate:border-primary indeterminate:bg-primary hover:border-text-secondary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-50 ${isInvalid ? 'border-danger' : 'border-border'} ${className}`}
    />
    <Check aria-hidden strokeWidth={3} size={12} className="pointer-events-none absolute hidden text-bg-brand peer-checked:block peer-indeterminate:hidden peer-disabled:opacity-50" />
    <Minus aria-hidden strokeWidth={3} size={12} className="pointer-events-none absolute hidden text-bg-brand peer-indeterminate:block peer-disabled:opacity-50" />
  </span>

  if (label === undefined) return <span className={`inline-flex ${containerClassName}`}>{box}</span>

  return <span className={`inline-flex flex-col gap-0.5 ${containerClassName}`}>
    <label htmlFor={inputId} className={`inline-flex items-start gap-2 ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
      {box}
      <span className="min-w-0">{label}</span>
    </label>
    {description ? <span id={descriptionId} className="pl-6 text-[11px] text-text-muted">{description}</span> : null}
  </span>
})
