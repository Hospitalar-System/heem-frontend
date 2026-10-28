import { useCallback } from 'react'
import type { TopEquipment } from '../api/reports'
import { formatCount, formatHours, useSortedRows } from './report-format'
import { SectionEmpty, SortableHeader } from './report-ui'

type TopSortKey = 'nome' | 'qtdChamados' | 'mtbfHoras'

export function ReportTopEquipment({ items }: { items: TopEquipment[] }) {
  const getValue = useCallback((row: TopEquipment, key: TopSortKey) => row[key], [])
  const { sorted, sort, toggle } = useSortedRows(items, getValue, { key: 'qtdChamados', direction: 'desc' })
  return (
    <section aria-labelledby="top-equipment-title" className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="border-b border-border px-5 py-4"><h2 id="top-equipment-title" className="text-sm font-semibold text-text-primary">Equipamentos com mais chamados</h2><p className="mt-1 text-xs text-text-muted">Top 10 do período, com o MTBF de cada equipamento</p></div>
      {items.length === 0 ? <div className="p-5"><SectionEmpty>Nenhum chamado aberto no período para os filtros selecionados.</SectionEmpty></div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <caption className="sr-only">Equipamentos com mais chamados no período</caption>
            <thead className="text-text-secondary">
              <tr className="table-head">
                <SortableHeader label="Equipamento" sortKey="nome" sort={sort} onToggle={toggle} align="left" />
                <SortableHeader label="Chamados" sortKey="qtdChamados" sort={sort} onToggle={toggle} />
                <SortableHeader label="MTBF" sortKey="mtbfHoras" sort={sort} onToggle={toggle} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((item) => (
                <tr key={item.equipamentoId} className="row-divider">
                  <th scope="row" className="px-4 py-2 text-left font-medium text-text-primary">{item.nome ?? 'Equipamento excluído'}{item.codigo && <span className="ml-2 font-normal text-text-muted">{item.codigo}</span>}</th>
                  <td className="px-4 py-2 text-right font-semibold tabular-nums text-text-primary">{formatCount(item.qtdChamados)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-text-secondary">{formatHours(item.mtbfHoras)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
