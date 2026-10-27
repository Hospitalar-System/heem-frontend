import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Select } from './Select'

export const PAGINATION_SIZES = [10, 25, 50] as const

export type PaginationProps = {
  /** Página atual, 1-based. */
  page: number
  /** Itens por página. */
  size: number
  /** Total de itens (todas as páginas). Com 0 a barra não aparece. */
  total: number
  onPageChange: (page: number) => void
  onSizeChange: (size: number) => void
  className?: string
}

type PageItem = number | 'gap-start' | 'gap-end'

/** Até 7 posições: primeira, última, a atual e suas vizinhas, com reticências no meio. */
export function pageItems(page: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1)
  if (page <= 4) return [1, 2, 3, 4, 5, 'gap-end', totalPages]
  if (page >= totalPages - 3) return [1, 'gap-start', ...Array.from({ length: 5 }, (_, index) => totalPages - 4 + index)]
  return [1, 'gap-start', page - 1, page, page + 1, 'gap-end', totalPages]
}

const controlClass = 'inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary aria-disabled:cursor-not-allowed aria-disabled:opacity-40'
const idleClass = 'border-transparent text-text-secondary hover:bg-surface-hi aria-disabled:hover:bg-transparent'
const currentClass = 'border-primary bg-primary text-bg-brand'

/**
 * Paginação compartilhada das listas: "Mostrando X–Y de Z", anterior/próxima, números com
 * reticências e seletor de itens por página (10, 25, 50). O estado vive na URL via `usePaginationParams`.
 */
export function Pagination({ page, size, total, onPageChange, onSizeChange, className = '' }: PaginationProps) {
  if (total <= 0) return null
  const totalPages = Math.max(1, Math.ceil(total / size))
  const current = Math.min(Math.max(1, page), totalPages)
  const from = (current - 1) * size + 1
  const to = Math.min(current * size, total)
  const go = (target: number) => { if (target >= 1 && target <= totalPages && target !== current) onPageChange(target) }
  const atStart = current <= 1
  const atEnd = current >= totalPages

  return <nav aria-label="Paginação" className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-text-secondary ${className}`}>
    <p aria-live="polite" aria-atomic="true">Mostrando {from}–{to} de {total}</p>
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="hidden md:inline">Itens por página</span>
        <div className="w-20"><Select size="sm" aria-label="Itens por página" value={String(size)} onChange={(next) => onSizeChange(Number(next))} options={PAGINATION_SIZES.map((option) => ({ value: String(option), label: String(option) }))} /></div>
      </div>
      {totalPages > 1 && <ul className="flex items-center gap-1">
        <li><button type="button" aria-label="Página anterior" aria-disabled={atStart} onClick={() => go(current - 1)} className={`${controlClass} ${idleClass}`}><ChevronLeft aria-hidden="true" size={14} /></button></li>
        {pageItems(current, totalPages).map((item) => typeof item === 'string'
          ? <li key={item} aria-hidden="true" className="grid h-9 min-w-6 place-items-center text-text-muted">…</li>
          : <li key={item}><button type="button" aria-label={`Ir para a página ${item}`} aria-current={item === current ? 'page' : undefined} onClick={() => go(item)} className={`${controlClass} ${item === current ? currentClass : idleClass}`}>{item}</button></li>)}
        <li><button type="button" aria-label="Próxima página" aria-disabled={atEnd} onClick={() => go(current + 1)} className={`${controlClass} ${idleClass}`}><ChevronRight aria-hidden="true" size={14} /></button></li>
      </ul>}
    </div>
  </nav>
}
