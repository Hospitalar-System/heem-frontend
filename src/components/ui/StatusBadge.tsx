import type { ReactNode } from 'react'
import { Badge, type BadgeVariant } from './Badge'

export type StatusTone = BadgeVariant

export type StatusBadgeProps = {
  tone?: StatusTone
  /** O texto é sempre renderizado: o tom nunca é a única informação. */
  children: ReactNode
  className?: string
}

/** Casca fina: mapeia o status da linha para a variante do `Badge` compartilhado. */
export function StatusBadge({ tone = 'neutral', children, className }: StatusBadgeProps) {
  return <Badge variant={tone} className={className}>{children}</Badge>
}
