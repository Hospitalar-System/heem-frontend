import type { ReactNode } from 'react'

/** Altura/tamanho único dos campos de filtro (Select `size="sm"`, inputs e DatePicker `size="sm"`). */
export const filterInputClass = 'h-9 w-full rounded-md border border-border bg-bg px-3 text-xs text-text-primary outline-none placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/20'

/**
 * Grade responsiva de filtros: colunas iguais (mín. 11rem), quebra sozinha em 360/768/1280 px.
 * Todos os campos devem usar `size="sm"` (altura 36px) para ficarem alinhados.
 */
export function FilterBar({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return <section aria-label={label} className={`grid grid-cols-[repeat(auto-fill,minmax(min(100%,11rem),1fr))] items-center gap-2 ${className}`}>{children}</section>
}

/** Campo largo (busca): ocupa duas colunas quando houver espaço. */
export function FilterWide({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`min-w-0 sm:col-span-2 ${className}`}>{children}</div>
}

/** Intervalo "de ... até ...": linha própria que quebra em coluna quando estreita. */
export function FilterRange({ label = 'Período', from, to }: { label?: string; from: ReactNode; to: ReactNode }) {
  return <div role="group" aria-label={label} className="col-span-full flex flex-wrap items-center gap-2">
    <span className="text-xs text-text-secondary">{label}</span>
    <div className="min-w-[9.5rem] flex-1 sm:max-w-[13rem]">{from}</div>
    <span className="text-xs text-text-secondary">até</span>
    <div className="min-w-[9.5rem] flex-1 sm:max-w-[13rem]">{to}</div>
  </div>
}
