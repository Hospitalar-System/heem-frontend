import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { backlogTicketsPath } from '@/features/maintenance/utils/ticket-filters'
import type { TicketAge } from '@/features/maintenance/utils/ticket-filters'
import type { BacklogReport, BacklogSeverity } from '../api/reports'
import { formatCount, useSortedRows } from './report-format'
import { SectionEmpty, SortableHeader } from './report-ui'

type BacklogSortKey = 'severidade' | 'ate24h' | 'de1a3Dias' | 'maisDe3Dias' | 'total'

const severityLabels: Record<string, string> = { BAIXA: 'Baixa', MEDIA: 'Média', ALTA: 'Alta', CRITICA: 'Crítica' }
const bands: { key: 'ate24h' | 'de1a3Dias' | 'maisDe3Dias'; idade: TicketAge; label: string }[] = [
  { key: 'ate24h', idade: 'ate24h', label: 'até 24 h' },
  { key: 'de1a3Dias', idade: 'de1a3dias', label: '1 a 3 dias' },
  { key: 'maisDe3Dias', idade: 'maisde3dias', label: 'mais de 3 dias' },
]
const severityRank: Record<string, number> = { BAIXA: 0, MEDIA: 1, ALTA: 2, CRITICA: 3 }

const cellLink = 'block rounded px-1 py-0.5 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary'

/** Backlog por severidade e idade; severidade, faixas e total levam à lista de chamados já filtrada (mesmo hospital e setor). */
export function ReportBacklog({ backlog, hospitalId, setorId }: { backlog: BacklogReport; hospitalId?: string; setorId?: string }) {
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
              <tr className="table-head">
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
                  <th scope="row" className="px-3 py-1.5 text-left font-medium text-text-primary"><Link to={backlogTicketsPath({ severidade: row.severidade, hospitalId, setorId })} className={cellLink} aria-label={`Ver chamados pendentes de severidade ${severityLabels[row.severidade] ?? row.severidade}`}>{severityLabels[row.severidade] ?? row.severidade}</Link></th>
                  {bands.map(({ key, idade, label }) => <td key={key} className={`px-3 py-1.5 text-right tabular-nums ${key === 'maisDe3Dias' && row[key] > 0 ? 'font-semibold text-danger' : 'text-text-secondary'}`}><Link to={backlogTicketsPath({ severidade: row.severidade, idade, hospitalId, setorId })} className={cellLink} aria-label={`Ver ${formatCount(row[key])} chamados ${severityLabels[row.severidade] ?? row.severidade} com ${label}`}>{formatCount(row[key])}</Link></td>)}
                  <td className="px-3 py-1.5 text-right font-semibold tabular-nums text-text-primary"><Link to={backlogTicketsPath({ severidade: row.severidade, hospitalId, setorId })} className={cellLink} aria-label={`Ver ${formatCount(row.total)} chamados pendentes de severidade ${severityLabels[row.severidade] ?? row.severidade}`}>{formatCount(row.total)}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
