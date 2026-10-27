import type { ReactNode } from 'react'
import { Badge, type BadgeVariant } from './Badge'

export type StatusTone = BadgeVariant

const sizeClass = {
  /** Selo de situação da linha (Ativa/Inativa), como na lista de Categorias. */
  md: 'px-2.5 py-1 text-[11px] font-medium',
  /** Selo auxiliar ao lado do nome (ex.: Revisar). */
  sm: 'px-2 py-0.5 text-[10px] font-semibold',
} as const

export type StatusBadgeProps = {
  tone?: StatusTone
  size?: keyof typeof sizeClass
  /** O texto é sempre renderizado: o tom nunca é a única informação. */
  children: ReactNode
  className?: string
}

/** Casca fina: status → variante do `Badge` compartilhado, com os tamanhos da lista de Categorias. */
export function StatusBadge({ tone = 'neutral', size = 'md', children, className = '' }: StatusBadgeProps) {
  return <Badge variant={tone} className={`${sizeClass[size]} ${className}`}>{children}</Badge>
}
