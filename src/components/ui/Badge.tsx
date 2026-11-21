import type { HTMLAttributes, ReactNode } from 'react'

export type BadgeVariant = 'neutral' | 'muted' | 'success' | 'warning' | 'danger' | 'info'

const variantClass: Record<BadgeVariant, string> = {
  neutral: 'badge-neutral',
  muted: 'badge-muted',
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  info: 'badge-info',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** neutro, sucesso, atenção (warning), perigo (danger) ou info. */
  variant?: BadgeVariant
  /** Ícone opcional antes do texto (decorativo). */
  icon?: ReactNode
  /** Contorno na cor do texto (ex.: SLA em risco), além do fundo suave. */
  outline?: boolean
}

/** Selo de condição: fundo suave na cor semântica, sem borda; tamanho e raio únicos (F6.7). */
export function Badge({ variant = 'neutral', icon, outline = false, className = '', children, ...props }: BadgeProps) {
  return (
    <span {...props} className={`inline-flex min-h-6 items-center gap-1 whitespace-nowrap rounded-md px-2 text-[11px] font-medium leading-4 ${variantClass[variant]} ${outline ? 'border border-current !bg-transparent' : ''} ${className}`.trim()}>
      {icon ? <span aria-hidden="true" className="inline-flex shrink-0">{icon}</span> : null}
      {children}
    </span>
  )
}
