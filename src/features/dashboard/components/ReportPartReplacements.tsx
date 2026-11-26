import { ChevronRight } from 'lucide-react'
import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import type { PartReplacementEquipment } from '../api/reports'
import { formatCount, useSortedRows } from './report-format'
import { SectionEmpty, SortableHeader } from './report-ui'

type PartSortKey = 'nome' | 'trocas' | 'pecas' | 'chamados'

/** Story 25.2: top 10 de trocas de peça no período; cada linha leva à ficha do equipamento. */
export function ReportPartReplacements({ items }: { items: PartReplacementEquipment[] }) {
  const getValue = useCallback((row: PartReplacementEquipment, key: PartSortKey) => row[key], [])
  const { sorted, sort, toggle } = useSortedRows(items, getValue, { key: 'trocas', direction: 'desc' })
  return (
    <section aria-labelledby="part-replacements-title" className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="border-b border-border px-5 py-4"><h2 id="part-replacements-title" className="text-sm font-semibold text-text-primary">Trocas de peça por equipamento</h2><p className="mt-1 text-xs text-text-muted">Top 10 do período: registros de troca, peças trocadas e chamados com troca</p></div>
      {items.length === 0 ? <div className="p-5"><SectionEmpty>Nenhuma peça trocada no período para os filtros selecionados.</SectionEmpty></div> : (
        <div className="overflow-x-auto">
          <table className="tabular-nums w-full text-xs">
            <caption className="sr-only">Trocas de peça por equipamento no período</caption>
            <thead className="text-text-secondary">
              <tr className="table-head">
                <SortableHeader label="Equipamento" sortKey="nome" sort={sort} onToggle={toggle} align="left" />
                <SortableHeader label="Trocas" sortKey="trocas" sort={sort} onToggle={toggle} />
                <SortableHeader label="Peças" sortKey="pecas" sort={sort} onToggle={toggle} />
                <SortableHeader label="Chamados" sortKey="chamados" sort={sort} onToggle={toggle} />
                <th scope="col" className="w-8"><span className="sr-only">Ver equipamento</span></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item) => (
                <tr key={item.equipamentoId} className="row-divider relative cursor-pointer hover:bg-surface-hi">
                  <th scope="row" className="px-4 py-2 text-left font-medium text-text-primary"><Link to={`/assets/${item.equipamentoId}`} aria-label={`${item.nome ?? 'Equipamento excluído'}${item.codigo ? `, ${item.codigo}` : ''}, ${formatCount(item.trocas)} ${item.trocas === 1 ? 'troca' : 'trocas'}`} className="rounded-sm underline decoration-dotted decoration-1 underline-offset-4 outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-primary">{item.nome ?? 'Equipamento excluído'}{item.codigo && <span className="ml-2 whitespace-nowrap font-normal text-text-muted">{item.codigo}</span>}</Link></th>
                  <td className="px-4 py-2 text-right font-semibold tabular-nums text-text-primary">{formatCount(item.trocas)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-text-secondary">{formatCount(item.pecas)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-text-secondary">{formatCount(item.chamados)}</td>
                  <td aria-hidden="true" className="w-8 pr-3 text-text-muted"><ChevronRight size={14} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
