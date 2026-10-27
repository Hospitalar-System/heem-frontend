import type { HTMLAttributes, KeyboardEvent, ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { Pagination, type PaginationProps } from './Pagination'
import { RowActionsMenu, type RowAction } from './RowActionsMenu'

export type SortDirection = 'asc' | 'desc'
export type DataTableSort = { key: string; direction: SortDirection }

export type DataColumn<T> = {
  /** Identificador estável da coluna (também usado na ordenação). */
  key: string
  /** Texto do cabeçalho. Use `''` em colunas sem título e informe `srHeader`. */
  header: ReactNode
  /** Rótulo para leitores de tela quando o cabeçalho é vazio. */
  srHeader?: string
  cell: (row: T) => ReactNode
  /** Largura CSS (ex.: '8rem', '20%'). */
  width?: string
  align?: 'left' | 'center' | 'right'
  /** Esconde a coluna abaixo do breakpoint (ela aparece de `sm`/`md`/`lg`/`xl` para cima). */
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl'
  /** Cabeçalho clicável; a ordenação em si é controlada de fora (`sort` + `onSortChange`). */
  sortable?: boolean
  className?: string
  /** Classes do cabeçalho (ex.: `uppercase`). */
  headerClassName?: string
}

export type DataTableEmpty = {
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  /** Botão/link de ação (ex.: "Limpar filtros" ou "Criar categoria"). */
  action?: ReactNode
}

export type DataTableError = { message: ReactNode; onRetry?: () => void }

export type DataTableProps<T> = {
  columns: DataColumn<T>[]
  rows: readonly T[]
  getRowId: (row: T) => string
  /** Nome acessível da tabela. */
  label: string
  caption?: ReactNode
  onRowClick?: (row: T) => void
  /** Ações por linha no menu de três pontos; `rowLabel` nomeia o botão ("Ações de <nome>"). */
  rowActions?: (row: T) => RowAction[]
  rowLabel?: (row: T) => string
  rowActionsHeader?: string
  /** Linha selecionada (realce `row-selected` + `aria-current`). */
  selection?: { selectedId: string | null | undefined }
  /** Atributos extras por linha (ex.: role/aria-label quando a linha inteira navega). */
  rowProps?: (row: T) => HTMLAttributes<HTMLTableRowElement>
  /** Classes extras por linha (ex.: realce de severidade). */
  rowClassName?: (row: T) => string
  sort?: DataTableSort | null
  onSortChange?: (key: string) => void
  isLoading?: boolean
  loadingLabel?: string
  loadingRows?: number
  empty?: DataTableEmpty
  error?: DataTableError | null
  pagination?: PaginationProps
  /** Largura mínima da tabela antes de rolar na horizontal (ex.: '900px'). */
  minWidth?: string
  /** Altura das linhas (padrão `h-12`). */
  rowHeightClass?: string
  className?: string
}

const hideClass = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell', xl: 'hidden xl:table-cell' } as const
const alignClass = { left: 'text-left', center: 'text-center', right: 'text-right' } as const
const shell = 'overflow-x-auto rounded-lg border border-border bg-surface'

function cellClass<T>(column: DataColumn<T>) {
  return [column.hideBelow ? hideClass[column.hideBelow] : '', alignClass[column.align ?? 'left'], column.className ?? ''].filter(Boolean).join(' ')
}

/** Tabela padrão das listas (formato da lista de Categorias): colunas, selos e ações configuráveis. */
export function DataTable<T>({
  columns, rows, getRowId, label, caption, onRowClick, rowActions, rowLabel, rowActionsHeader = 'Ações', selection, rowClassName, rowProps,
  sort, onSortChange, isLoading = false, loadingLabel, loadingRows = 6, empty, error, pagination, minWidth = '720px', rowHeightClass = 'h-12', className = '',
}: DataTableProps<T>) {
  if (error) {
    return <section role="alert" className={`rounded-lg border border-danger/40 bg-surface p-5 text-sm text-text-primary ${className}`}>
      <p>{error.message}</p>
      {error.onRetry ? <button type="button" className="mt-2 text-xs font-semibold text-primary underline" onClick={error.onRetry}>Tentar novamente</button> : null}
    </section>
  }

  const hasActions = Boolean(rowActions)
  const columnCount = columns.length + (hasActions ? 1 : 0)

  if (isLoading) {
    return <div aria-label={loadingLabel ?? `Carregando ${label.toLocaleLowerCase('pt-BR')}`} aria-busy="true" className={`${shell} ${className}`}>
      <table aria-hidden="true" className="w-full border-collapse text-left" style={{ minWidth }}>
        <thead><tr className="table-head h-12 text-[11px]">{columns.map((column) => <th key={column.key} scope="col" style={{ width: column.width }} className={`px-4 font-medium ${column.headerClassName ?? ''} ${cellClass(column)}`}>{column.header}</th>)}{hasActions ? <th scope="col" className="w-12 px-4 font-medium" /> : null}</tr></thead>
        <tbody>{Array.from({ length: loadingRows }, (_, row) => <tr key={row} data-skeleton-row className={`row-idle row-divider ${rowHeightClass}`}>
          {Array.from({ length: columnCount }, (__, cell) => <td key={cell} className={`px-4 ${columns[cell] ? cellClass(columns[cell]) : ''}`}><div className="h-4 w-3/4 animate-pulse rounded bg-bg" /></td>)}
        </tr>)}</tbody>
      </table>
    </div>
  }

  if (rows.length === 0) {
    if (!empty) return null
    return <section className={`grid min-h-64 place-items-center rounded-lg border border-dashed border-border bg-surface p-8 text-center ${className}`}>
      <div>
        {empty.icon ? <div aria-hidden="true" className="flex justify-center text-text-muted">{empty.icon}</div> : null}
        <h2 className="mt-3 font-semibold">{empty.title}</h2>
        {empty.description ? <p className="mt-1 max-w-md text-sm text-text-secondary">{empty.description}</p> : null}
        {empty.action ? <div className="mt-4 flex justify-center">{empty.action}</div> : null}
      </div>
    </section>
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, row: T) => {
    if (event.target !== event.currentTarget) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onRowClick?.(row)
    }
  }

  return <div className={className}>
    <div className={shell}>
      <table aria-label={label} className="w-full border-collapse text-left" style={{ minWidth }}>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead><tr className="table-head h-12 text-[11px]">
          {columns.map((column) => {
            const active = sort?.key === column.key ? sort : null
            const ariaSort = column.sortable ? (active ? (active.direction === 'asc' ? 'ascending' : 'descending') : 'none') : undefined
            const Icon = active ? (active.direction === 'asc' ? ArrowUp : ArrowDown) : ChevronsUpDown
            return <th key={column.key} scope="col" aria-sort={ariaSort} style={{ width: column.width }} className={`px-4 font-medium ${column.headerClassName ?? ''} ${cellClass(column)}`}>
              {column.sortable
                ? <button type="button" onClick={() => onSortChange?.(column.key)} className="inline-flex items-center gap-1 rounded font-medium outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-primary">{column.header}<Icon aria-hidden="true" size={12} /></button>
                : column.header || (column.srHeader ? <span className="sr-only">{column.srHeader}</span> : null)}
            </th>
          })}
          {hasActions ? <th scope="col" className="w-12 px-4 font-medium"><span className="sr-only">{rowActionsHeader}</span></th> : null}
        </tr></thead>
        <tbody>{rows.map((row) => {
          const id = getRowId(row)
          const selected = selection?.selectedId === id
          const classes = ['row-idle row-divider text-xs', rowHeightClass, onRowClick ? 'row-clickable' : '', selected ? 'row-selected' : '', rowClassName?.(row) ?? ''].filter(Boolean).join(' ')
          return <tr
            key={id}
            {...rowProps?.(row)}
            className={classes}
            aria-current={selected ? 'true' : undefined}
            tabIndex={onRowClick ? 0 : undefined}
            onClick={onRowClick ? (event) => { if (!(event.target as HTMLElement).closest('a,button,input,select,textarea,[role="menu"]')) onRowClick(row) } : undefined}
            onKeyDown={onRowClick ? (event) => onKeyDown(event, row) : undefined}
          >
            {columns.map((column) => <td key={column.key} className={`px-4 ${cellClass(column)}`}>{column.cell(row)}</td>)}
            {rowActions ? <td className="px-4"><div className="flex justify-end">{(() => { const actions = rowActions(row); return actions.length ? <RowActionsMenu label={rowLabel ? rowLabel(row) : id} actions={actions} /> : null })()}</div></td> : null}
          </tr>
        })}</tbody>
      </table>
    </div>
    {pagination ? <Pagination {...pagination} className={`mt-2 rounded-lg border border-border bg-surface ${pagination.className ?? ''}`} /> : null}
  </div>
}
