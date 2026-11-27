import { useCallback, useState } from 'react'
import { Select } from '@/components/ui/Select'
import type { RatingGroup, TicketRatings } from '../api/reports'
import { formatCount, useSortedRows } from './report-format'
import { SectionEmpty, SortableHeader } from './report-ui'

type Grouping = 'porTecnico' | 'porHospital'
type SortKey = 'nome' | 'quantidade' | 'media'
const groupingOptions: { value: Grouping; label: string }[] = [{ value: 'porTecnico', label: 'Técnico' }, { value: 'porHospital', label: 'Hospital' }]
const ratingFormat = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const formatRating = (value: number | null | undefined) => (typeof value === 'number' ? `${ratingFormat.format(value)} / 5` : '—')

/** Story 23.5: média das notas (1 a 5) que os solicitantes deram aos chamados resolvidos no período. */
export function ReportTicketRatings({ data: bruto }: { data: TicketRatings }) {
  const list = (value: unknown) => (Array.isArray(value) ? value : [])
  const data = { ...bruto, porTecnico: list(bruto.porTecnico), porHospital: list(bruto.porHospital) } as TicketRatings
  const [grouping, setGrouping] = useState<Grouping>('porTecnico')
  const label = groupingOptions.find((option) => option.value === grouping)?.label ?? 'Técnico'
  const getValue = useCallback((row: RatingGroup, key: SortKey) => row[key], [])
  const { sorted, sort, toggle } = useSortedRows(data[grouping], getValue, { key: 'media', direction: 'desc' })

  return (
    <section aria-labelledby="ticket-ratings-title" className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 id="ticket-ratings-title" className="text-sm font-semibold text-text-primary">Avaliação dos solicitantes</h2>
          <p className="mt-1 text-xs text-text-muted">Notas de 1 a 5 dadas pelo solicitante aos chamados resolvidos no período.</p>
        </div>
        <dl className="flex items-baseline gap-4 text-right">
          <div><dt className="text-[11px] text-text-muted">Avaliações</dt><dd className="text-sm font-semibold tabular-nums text-text-primary">{formatCount(data.quantidade)}</dd></div>
          <div><dt className="text-[11px] text-text-muted">Média</dt><dd className="text-sm font-semibold tabular-nums text-text-primary">{formatRating(data.media)}</dd></div>
        </dl>
      </div>
      {data.quantidade === 0 ? <div className="p-5"><SectionEmpty>Nenhuma avaliação no período para os filtros selecionados.</SectionEmpty></div> : <>
        <div className="flex items-center justify-end gap-2 px-5 pt-4">
          <span className="text-xs text-text-secondary">Agrupar por</span>
          <Select size="sm" aria-label="Agrupar avaliações por" value={grouping} onChange={(next) => setGrouping(next as Grouping)} options={groupingOptions} className="w-36" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs tabular-nums">
            <caption className="sr-only">Avaliações por {label.toLowerCase()}</caption>
            <thead className="text-text-secondary"><tr className="table-head">
              <SortableHeader label={label} sortKey="nome" sort={sort} onToggle={toggle} align="left" />
              <SortableHeader label="Avaliações" sortKey="quantidade" sort={sort} onToggle={toggle} />
              <SortableHeader label="Média" sortKey="media" sort={sort} onToggle={toggle} />
            </tr></thead>
            <tbody>{sorted.map((row) => <tr key={row.id ?? row.nome} className="row-divider">
              <th scope="row" className="px-4 py-2 text-left font-medium text-text-primary">{row.id === null && grouping === 'porTecnico' ? 'Sem responsável' : row.nome}</th>
              <td className="px-4 py-2 text-right text-text-secondary">{formatCount(row.quantidade)}</td>
              <td className="px-4 py-2 text-right font-semibold text-text-primary">{formatRating(row.media)}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </>}
    </section>
  )
}
