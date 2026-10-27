import type { LucideIcon } from 'lucide-react'
import { Plus } from 'lucide-react'
import type { ReactNode, Ref } from 'react'
import { Link } from 'react-router-dom'

type PageActionProps = {
  children: ReactNode
  /** Ícone lucide à esquerda do rótulo. Padrão: `Plus`. */
  icon?: LucideIcon
  variant?: 'primary' | 'secondary'
  /** Se informado, renderiza um `Link` (navegação); caso contrário, um `button`. */
  to?: string
  onClick?: () => void
  disabled?: boolean
  /** Largura total no mobile (corpo da página/estado vazio). */
  fullWidthMobile?: boolean
  /** No mobile mostra só o ícone (o rótulo continua como nome acessível). Use no cabeçalho. */
  collapseLabelOnMobile?: boolean
  className?: string
  /** Ref do botão (ex.: devolver o foco ao fechar um modal). */
  buttonRef?: Ref<HTMLButtonElement>
}

const base = 'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-50'
const variants = {
  primary: 'bg-primary text-bg-brand hover:bg-primary-hover',
  secondary: 'border border-border bg-surface text-text-primary hover:bg-bg',
}

/**
 * Ação principal de página ("Novo equipamento", "Nova OT"...): tamanho, raio e foco únicos.
 * Posicione-a no slot `action` do `AdminPageShell` (canto superior direito do cabeçalho).
 */
export function PageAction({ children, icon: Icon = Plus, variant = 'primary', to, onClick, disabled, fullWidthMobile = false, collapseLabelOnMobile = false, className = '', buttonRef }: PageActionProps) {
  const classes = [
    base, variants[variant],
    fullWidthMobile ? 'max-sm:w-full' : '',
    collapseLabelOnMobile ? 'max-sm:w-9 max-sm:px-0' : '',
    className,
  ].filter(Boolean).join(' ')
  const content = <>
    <Icon aria-hidden="true" size={14} className="shrink-0" />
    <span className={collapseLabelOnMobile ? 'max-sm:sr-only' : ''}>{children}</span>
  </>
  if (to && !disabled) return <Link to={to} className={classes}>{content}</Link>
  return <button ref={buttonRef} type="button" onClick={onClick} disabled={disabled} className={classes}>{content}</button>
}
