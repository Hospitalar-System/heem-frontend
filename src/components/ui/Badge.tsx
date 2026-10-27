import type { HTMLAttributes, ReactNode } from 'react'

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

// PROVISÓRIO (F6.5b): o Badge canônico é do Roberto (#101/#103) e substitui este arquivo mantendo a assinatura.
const tokens: Record<BadgeVariant, { color: string; mix: string }> = {
  neutral: { color: 'var(--text-muted)', mix: 'var(--text-muted)' },
  success: { color: 'var(--primary)', mix: 'var(--primary)' },
  warning: { color: 'var(--warning)', mix: 'var(--warning)' },
  danger: { color: 'var(--danger)', mix: 'var(--danger)' },
  info: { color: 'var(--text-primary)', mix: 'var(--text-secondary)' },
}

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant; icon?: ReactNode }

/** Selo com fundo suave (color-mix sobre o token), sem borda; o texto é sempre visível. */
export function Badge({ variant = 'neutral', icon, children, className = '', style, ...rest }: BadgeProps) {
  const { color, mix } = tokens[variant]
  return <span data-variant={variant} {...rest} style={{ color, backgroundColor: `color-mix(in srgb, ${mix} 14%, transparent)`, ...style }} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full ${className}`}>{icon ? <span aria-hidden="true" className="grid place-items-center">{icon}</span> : null}{children}</span>
}
