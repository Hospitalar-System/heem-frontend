import { useCallback } from 'react'
import type { BacklogReport, BacklogSeverity } from '../api/reports'
import { formatCount, useSortedRows } from './report-format'
import { SectionEmpty, SortableHeader } from './report-ui'

type BacklogSortKey = 'severidade' | 'ate24h' | 'de1a3Dias' | 'maisDe3Dias' | 'total'

const severityLabels: Record<string, string> = { BAIXA: 'Baixa', MEDIA: 'Média', ALTA: 'Alta', CRITICA: 'Crítica' }
const severityRank: Record<string, number> = { BAIXA: 0, MEDIA: 1, ALTA: 2, CRITICA: 3 }

export function ReportBacklog({ backlog }: { backlog: BacklogReport }) {
  const getValue = useCallback((row: BacklogSeverity, key: BacklogSortKey) => key === 'severidade' ? severityRank[row.severidade] ?? -1 : row[key], [])
  const { sorted, sort, toggle } = useSortedRows(backlog.porSeveridade, getValue, { key: 'severidade', direction: 'desc' })
  return (
    <section aria-labelledby="backlog-title" className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div><h2 id="backlog-title" className="text-sm font-semibold text-text-primary">Backlog de chamados</h2><p className="mt-1 text-xs text-text-muted">Chamados ainda não resolvidos agora, por severidade e idade (não depende do período)</p></div>
        <div className="text-right"><p className="text-xs text-text-secondary">Total</p><p aria-label="Total do backlog" className="text-2xl font-semibold text-text-primary">{formatCount(backlog.total)}</p></div>
      </div>
      {backlog.total === 0 ? <div className="p-5"><SectionEmpty>Nenhum chamado em aberto para os filtros selecionados.</SectionEmpty></div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <caption className="sr-only">Backlog de chamados por severidade e faixa de idade</caption>
            <thead className="text-text-secondary">
              <tr className="border-b border-border">
                <SortableHeader label="Severidade" sortKey="severidade" sort={sort} onToggle={toggle} align="left" />
                <SortableHeader label="Até 24 h" sortKey="ate24h" sort={sort} onToggle={toggle} />
                <SortableHeader label="1 a 3 dias" sortKey="de1a3Dias" sort={sort} onToggle={toggle} />
                <SortableHeader label="Mais de 3 dias" sortKey="maisDe3Dias" sort={sort} onToggle={toggle} />
                <SortableHeader label="Total" sortKey="total" sort={sort} onToggle={toggle} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.severidade} className="row-divider">
                  <th scope="row" className="px-4 py-2 text-left font-medium text-text-primary">{severityLabels[row.severidade] ?? row.severidade}</th>
                  <td className="px-4 py-2 text-right tabular-nums text-text-secondary">{formatCount(row.ate24h)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-text-secondary">{formatCount(row.de1a3Dias)}</td>
                  <td className={`px-4 py-2 text-right tabular-nums ${row.maisDe3Dias > 0 ? 'font-semibold text-danger' : 'text-text-secondary'}`}>{formatCount(row.maisDe3Dias)}</td>
                  <td className="px-4 py-2 text-right font-semibold tabular-nums text-text-primary">{formatCount(row.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
