import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { Select } from '@/components/ui/Select'
import type { NotDoneVisits, NotDoneVisitsGroup } from '../api/reports'
import { formatCount, formatPercent, useSortedRows } from './report-format'
import { SectionEmpty, SortableHeader } from './report-ui'

type Grouping = 'porHospital' | 'porSetor' | 'porTecnico'
type SortKey = 'nome' | 'encerradas' | 'naoRealizadas' | 'percentual'
const groupingOptions: { value: Grouping; label: string; column: string }[] = [
  { value: 'porHospital', label: 'Hospital', column: 'Hospital' },
  { value: 'porSetor', label: 'Setor', column: 'Setor' },
  { value: 'porTecnico', label: 'Técnico', column: 'Técnico' },
]

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })
const formatDate = (iso: string) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '—' : dateFormat.format(d) }

/**
 * Story 23.7: preventivas encerradas sem execução porque o equipamento estava em uso, sobre as preventivas encerradas
 * (concluídas + não realizadas) do período; e os equipamentos que acumulam 2 ou mais visitas seguidas assim.
 */
export function ReportNotDoneVisits({ data: bruto }: { data: NotDoneVisits }) {
  const list = (value: unknown) => (Array.isArray(value) ? value : [])
  const data = { ...bruto, porHospital: list(bruto.porHospital), porSetor: list(bruto.porSetor), porTecnico: list(bruto.porTecnico), emUsoSeguidas: list(bruto.emUsoSeguidas) } as NotDoneVisits
  const [grouping, setGrouping] = useState<Grouping>('porHospital')
  const groupInfo = groupingOptions.find((option) => option.value === grouping) ?? groupingOptions[0]
  const getValue = useCallback((row: NotDoneVisitsGroup, key: SortKey) => row[key], [])
  const { sorted, sort, toggle } = useSortedRows(data[grouping], getValue, { key: 'naoRealizadas', direction: 'desc' })

  return (
    <section aria-labelledby="not-done-visits-title" className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 id="not-done-visits-title" className="text-sm font-semibold text-text-primary">Visitas não realizadas (equipamento em uso)</h2>
          <p className="mt-1 text-xs text-text-muted">Preventivas encerradas sem execução porque o equipamento estava em uso, sobre as preventivas encerradas no período.</p>
        </div>
        <dl className="flex items-baseline gap-4 text-right">
          <div><dt className="text-[11px] text-text-muted">Encerradas</dt><dd className="text-sm font-semibold tabular-nums text-text-primary">{formatCount(data.encerradas)}</dd></div>
          <div><dt className="text-[11px] text-text-muted">Não realizadas</dt><dd className="text-sm font-semibold tabular-nums text-text-primary">{formatCount(data.naoRealizadas)}</dd></div>
          <div><dt className="text-[11px] text-text-muted">Percentual</dt><dd className="text-sm font-semibold tabular-nums text-text-primary">{formatPercent(data.percentual)}</dd></div>
        </dl>
      </div>

      {data.encerradas === 0 ? <div className="p-5"><SectionEmpty>Nenhuma preventiva encerrada no período para os filtros selecionados.</SectionEmpty></div> : <>
        <div className="flex items-center justify-end gap-2 px-5 pt-4">
          <span className="text-xs text-text-secondary">Agrupar por</span>
          <Select size="sm" aria-label="Agrupar visitas não realizadas por" value={grouping} onChange={(next) => setGrouping(next as Grouping)} options={groupingOptions} className="w-36" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs tabular-nums">
            <caption className="sr-only">Visitas não realizadas por {groupInfo.label.toLowerCase()}</caption>
            <thead className="text-text-secondary">
              <tr className="table-head">
                <SortableHeader label={groupInfo.column} sortKey="nome" sort={sort} onToggle={toggle} align="left" />
                <SortableHeader label="Encerradas" sortKey="encerradas" sort={sort} onToggle={toggle} />
                <SortableHeader label="Não realizadas" shortLabel="Não real." sortKey="naoRealizadas" sort={sort} onToggle={toggle} />
                <SortableHeader label="Percentual" shortLabel="%" sortKey="percentual" sort={sort} onToggle={toggle} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => <tr key={row.id ?? row.nome} className="row-divider">
                <th scope="row" className="px-4 py-2 text-left font-medium text-text-primary">{row.nome}</th>
                <td className="px-4 py-2 text-right text-text-secondary">{formatCount(row.encerradas)}</td>
                <td className="px-4 py-2 text-right text-text-secondary">{formatCount(row.naoRealizadas)}</td>
                <td className="px-4 py-2 text-right font-semibold text-text-primary">{formatPercent(row.percentual)}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </>}

      <div className="border-t border-border px-5 py-4">
        <h3 className="text-xs font-semibold text-text-primary">Equipamentos sem preventiva há 2 ou mais visitas seguidas (em uso)</h3>
        <p className="mt-1 text-[11px] text-text-muted">Situação atual, independente do período: combine a visita com o setor.</p>
        {data.emUsoSeguidas.length === 0 ? <p className="mt-3 text-xs text-text-muted">Nenhum equipamento nessa situação.</p> : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-xs tabular-nums">
              <caption className="sr-only">Equipamentos com visitas seguidas não realizadas</caption>
              <thead className="text-text-secondary"><tr className="table-head">
                {['Equipamento', 'Hospital / setor', 'Seguidas', 'Última'].map((label, index) => <th key={label} scope="col" className={`px-4 py-2 font-medium ${index >= 2 ? 'text-right' : 'text-left'}`}>{label}</th>)}
              </tr></thead>
              <tbody>{data.emUsoSeguidas.map((item) => <tr key={item.equipamentoId} className="row-divider">
                <th scope="row" className="px-4 py-2 text-left font-medium text-text-primary"><Link to={`/assets/${item.equipamentoId}`} className="underline decoration-dotted underline-offset-4">{item.nome}</Link><span className="ml-2 whitespace-nowrap font-normal text-text-muted">{item.codigo}</span></th>
                <td className="px-4 py-2 text-text-secondary">{item.hospitalNome} · {item.setorNome}</td>
                <td className="px-4 py-2 text-right font-semibold text-text-primary">{formatCount(item.seguidas)}</td>
                <td className="whitespace-nowrap px-4 py-2 text-right text-text-secondary">{formatDate(item.ultimaEm)}</td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
