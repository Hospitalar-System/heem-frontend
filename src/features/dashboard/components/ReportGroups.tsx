import { useCallback } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { chartTooltipProps } from '@/components/charts/ChartTooltip'
import type { IndicatorGroup, ReportGrouping } from '../api/reports'
import { formatCount, formatHours, formatPercent, useSortedRows } from './report-format'
import { SectionEmpty, SortableHeader } from './report-ui'

type GroupSortKey = 'grupoNome' | 'mttaHoras' | 'mttrHoras' | 'mtbfHoras' | 'disponibilidadePercentual' | 'slaAtendimentoPct' | 'slaResolucaoPct' | 'qtdOtsCorretivas'

const columns: Array<{ key: Exclude<GroupSortKey, 'grupoNome'>; label: string }> = [
  { key: 'mttaHoras', label: 'MTTA' },
  { key: 'mttrHoras', label: 'MTTR' },
  { key: 'mtbfHoras', label: 'MTBF' },
  { key: 'disponibilidadePercentual', label: 'Disponibilidade' },
  { key: 'slaAtendimentoPct', label: 'SLA atendimento' },
  { key: 'slaResolucaoPct', label: 'SLA resolução' },
  { key: 'qtdOtsCorretivas', label: 'OT corretivas' },
]

const groupLabels: Record<ReportGrouping, { singular: string; title: string }> = {
  hospital: { singular: 'Hospital', title: 'Indicadores por hospital' },
  setor: { singular: 'Setor', title: 'Indicadores por setor' },
}

function cell(group: IndicatorGroup, key: Exclude<GroupSortKey, 'grupoNome'>) {
  switch (key) {
    case 'mttaHoras': case 'mttrHoras': case 'mtbfHoras': return formatHours(group[key])
    case 'disponibilidadePercentual': case 'slaAtendimentoPct': case 'slaResolucaoPct': return formatPercent(group[key])
    case 'qtdOtsCorretivas': return formatCount(group.qtdOtsCorretivas)
  }
}

export function ReportGroups({ groups, grouping }: { groups: IndicatorGroup[]; grouping: ReportGrouping }) {
  const getValue = useCallback((group: IndicatorGroup, key: GroupSortKey) => group[key], [])
  const { sorted, sort, toggle } = useSortedRows(groups, getValue, { key: 'grupoNome', direction: 'asc' })
  const { singular, title } = groupLabels[grouping]
  const chartData = groups.map((group) => ({ nome: group.grupoNome, MTTA: group.mttaHoras ?? 0, MTTR: group.mttrHoras ?? 0 }))

  return (
    <section aria-labelledby="groups-title" className="overflow-hidden rounded-lg border border-border bg-surface">
      <h2 id="groups-title" className="border-b border-border px-5 py-4 text-sm font-semibold text-text-primary">{title}</h2>
      {groups.length === 0 ? <div className="p-5"><SectionEmpty>Nenhum grupo encontrado para os filtros selecionados.</SectionEmpty></div> : (
        <>
          <div role="img" aria-label={`MTTA e MTTR em horas por ${singular.toLowerCase()}: ${groups.map((group) => `${group.grupoNome}: MTTA ${formatHours(group.mttaHoras)}, MTTR ${formatHours(group.mttrHoras)}`).join('; ')}`} className="h-[220px] px-4 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="nome" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} interval={0} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} unit=" h" width={48} />
                <Tooltip {...chartTooltipProps} formatter={(value) => `${Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="MTTA" fill="var(--warning)" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Bar dataKey="MTTR" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <caption className="sr-only">{title}</caption>
              <thead className="text-text-secondary">
                <tr className="border-b border-border">
                  <SortableHeader label={singular} sortKey="grupoNome" sort={sort} onToggle={toggle} align="left" />
                  {columns.map(({ key, label }) => <SortableHeader key={key} label={label} sortKey={key} sort={sort} onToggle={toggle} />)}
                </tr>
              </thead>
              <tbody>
                {sorted.map((group) => (
                  <tr key={group.grupoId} className="border-b border-border last:border-0">
                    <th scope="row" className="px-4 py-2 text-left font-medium text-text-primary">{group.grupoNome}</th>
                    {columns.map(({ key }) => <td key={key} className="px-4 py-2 text-right tabular-nums text-text-secondary">{cell(group, key)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
