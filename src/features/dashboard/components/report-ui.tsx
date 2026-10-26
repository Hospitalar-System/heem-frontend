import type { SortDirection } from './report-format'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'

export function SortableHeader<K extends string>({ label, sortKey, sort, onToggle, align = 'right' }: { label: string; sortKey: K; sort: { key: K; direction: SortDirection }; onToggle: (key: K) => void; align?: 'left' | 'right' }) {
  const active = sort.key === sortKey
  const Icon = !active ? ChevronsUpDown : sort.direction === 'asc' ? ArrowUp : ArrowDown
  return (
    <th scope="col" aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className={`px-4 py-2 font-medium ${align === 'left' ? 'text-left' : 'text-right'}`}>
      <button type="button" onClick={() => onToggle(sortKey)} className="inline-flex items-center gap-1 rounded-sm outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-primary">
        {label}<Icon aria-hidden="true" size={12} />
      </button>
    </th>
  )
}

export function SectionSkeleton({ label, rows = 4 }: { label: string; rows?: number }) {
  return (
    <div aria-label={label} aria-busy="true" className="space-y-2 rounded-lg border border-border bg-surface p-5">
      <span className="sr-only">{label}.</span>
      {Array.from({ length: rows }, (_, index) => <div key={index} className="h-6 animate-pulse rounded bg-bg" />)}
    </div>
  )
}

export function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger/30 bg-danger/5 p-5"><p className="text-sm text-text-primary">{message}</p><button type="button" onClick={onRetry} className="rounded-md border border-border bg-surface px-3 py-2 text-xs font-medium text-text-primary outline-none hover:bg-bg focus-visible:ring-2 focus-visible:ring-primary">Tentar novamente</button></div>
}

export function SectionEmpty({ children }: { children: string }) {
  return <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-xs text-text-muted">{children}</p>
}
