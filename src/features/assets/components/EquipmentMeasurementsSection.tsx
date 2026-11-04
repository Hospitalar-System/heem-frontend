import { History } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { chartTooltipProps } from '@/components/charts/ChartTooltip'
import { Badge } from '@/components/ui/Badge'
import { Checkbox } from '@/components/ui/Checkbox'
import { DataTable, type DataColumn } from '@/components/ui/DataTable'
import { DatePicker } from '@/components/ui/DatePicker'
import { FilterBar, FilterRange } from '@/components/ui/FilterBar'
import { PAGINATION_SIZES } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { useEquipmentChecklistExecutions } from '../api/equipment-checklist-executions'
import type { ChecklistExecution, ChecklistExecutionItem } from '../types'

const numberFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 })
const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })

export interface MeasurementRow {
  key: string
  otId: string
  otCodigo: string
  concluidaEm: string | null
  item: ChecklistExecutionItem
}

/** Uma linha por item de cada execução; sem `withEmpty`, itens sem medição (valor nulo) ficam de fora. */
function flattenExecutions(executions: ChecklistExecution[], withEmpty: boolean): MeasurementRow[] {
  return executions.flatMap((execution) => execution.itens
    .filter((item) => withEmpty || (item.valor !== null && item.valor !== undefined))
    .map((item) => ({ key: `${execution.otId}:${item.itemId}`, otId: execution.otId, otCodigo: execution.otCodigo, concluidaEm: execution.concluidaEm, item })))
}

function localDay(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatDate(value: string | number | null) {
  if (value === null || value === '') return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : dateFormat.format(date)
}

function formatValue(item: ChecklistExecutionItem) {
  if (item.valor === null || item.valor === undefined) return '—'
  if (typeof item.valor === 'boolean') return item.valor ? 'Sim' : 'Não'
  if (typeof item.valor === 'number') return numberFormat.format(item.valor)
  return item.valor
}

function formatRange(item: ChecklistExecutionItem) {
  const unit = item.unidade ? ` ${item.unidade}` : ''
  const { faixaMin: min, faixaMax: max } = item
  if (min !== null && max !== null) return `${numberFormat.format(min)}–${numberFormat.format(max)}${unit}`
  if (min !== null) return `mín. ${numberFormat.format(min)}${unit}`
  if (max !== null) return `máx. ${numberFormat.format(max)}${unit}`
  if (item.valorReferencia !== null && item.valorReferencia !== undefined && item.valorReferencia !== '') return `Ref.: ${typeof item.valorReferencia === 'number' ? numberFormat.format(item.valorReferencia) : item.valorReferencia}`
  return '—'
}

function ResultBadge({ item }: { item: ChecklistExecutionItem }) {
  if (item.valor === null || item.valor === undefined) return <Badge variant="neutral">Sem medição</Badge>
  if (item.conforme === true) return <Badge variant="success">Conforme</Badge>
  if (item.conforme === false) return <Badge variant="danger">Não conforme</Badge>
  return <Badge variant="neutral">Sem avaliação</Badge>
}

function TrendChart({ rows }: { rows: MeasurementRow[] }) {
  const points = rows
    .filter((row) => typeof row.item.valor === 'number' && row.concluidaEm && !Number.isNaN(Date.parse(row.concluidaEm)))
    .map((row) => ({ time: Date.parse(row.concluidaEm as string), valor: row.item.valor as number }))
    .sort((a, b) => a.time - b.time)
  if (points.length === 0) return null
  const latest = rows[0].item
  const unit = latest.unidade ? ` ${latest.unidade}` : ''
  const hasRange = latest.faixaMin !== null || latest.faixaMax !== null
  const first = points[0]
  const last = points[points.length - 1]
  const summary = `Tendência de ${latest.descricao}: ${points.length} ${points.length === 1 ? 'medição' : 'medições'}, de ${numberFormat.format(first.valor)}${unit} em ${formatDate(first.time)} a ${numberFormat.format(last.valor)}${unit} em ${formatDate(last.time)}${hasRange ? `; faixa esperada ${formatRange(latest)}` : ''}.`
  return <div className="rounded-lg border border-border bg-surface p-4">
    <h4 className="text-xs font-semibold text-text-primary">Tendência: {latest.descricao}{latest.unidade ? ` (${latest.unidade})` : ''}</h4>
    <div role="img" aria-label={summary} className="mt-2 h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="time" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={(value: number) => formatDate(value)} axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
          <YAxis domain={['auto', 'auto']} width={40} axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
          <Tooltip {...chartTooltipProps} labelFormatter={(value) => formatDate(Number(value))} formatter={(value) => [`${numberFormat.format(Number(value))}${unit}`, latest.descricao]} />
          {latest.faixaMin !== null ? <ReferenceLine y={latest.faixaMin} stroke="var(--warning)" strokeDasharray="4 4" /> : null}
          {latest.faixaMax !== null ? <ReferenceLine y={latest.faixaMax} stroke="var(--warning)" strokeDasharray="4 4" /> : null}
          <Line type="monotone" dataKey="valor" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3, fill: 'var(--primary)' }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
    <p className="mt-1 text-[11px] text-text-muted">{hasRange ? 'Linhas tracejadas: limites da faixa atual do item. ' : ''}Valores das execuções carregadas nesta página.</p>
  </div>
}

export function EquipmentMeasurementsSection({ equipmentId, isAdmin }: { equipmentId: string; isAdmin: boolean }) {
  const [params, setParams] = useSearchParams()
  const rawPage = Number(params.get('mpagina'))
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1
  const rawSize = Number(params.get('mtamanho'))
  const size = (PAGINATION_SIZES as readonly number[]).includes(rawSize) ? rawSize : 10
  const itemParam = params.get('mitem') ?? ''
  const from = params.get('mde') ?? ''
  const to = params.get('mate') ?? ''
  const withEmpty = params.get('msem') === '1'

  const update = (patch: Record<string, string | undefined>, keepPage = false) => setParams((current) => {
    const next = new URLSearchParams(current)
    for (const [key, value] of Object.entries(patch)) { if (value) next.set(key, value); else next.delete(key) }
    if (!keepPage) next.delete('mpagina')
    return next
  })

  const query = useEquipmentChecklistExecutions(equipmentId, { pagina: page - 1, tamanho: size })
  const executions = useMemo(() => query.data?.items ?? [], [query.data])
  const total = query.data?.total ?? 0
  const allRows = useMemo(() => flattenExecutions(executions, withEmpty), [executions, withEmpty])
  const itemOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const row of allRows) if (!seen.has(row.item.itemId)) seen.set(row.item.itemId, row.item.descricao)
    return [{ value: '', label: 'Todos os itens' }, ...[...seen].map(([value, label]) => ({ value, label }))]
  }, [allRows])
  const itemId = itemOptions.some((option) => option.value === itemParam) ? itemParam : ''
  const rows = useMemo(() => allRows.filter((row) => {
    if (itemId && row.item.itemId !== itemId) return false
    const day = localDay(row.concluidaEm)
    if (from && (!day || day < from)) return false
    if (to && (!day || day > to)) return false
    return true
  }), [allRows, itemId, from, to])
  const hasFilter = Boolean(itemId || from || to)
  const chartRows = itemId ? rows.filter((row) => row.item.tipo === 'NUMERICO') : []

  const columns: DataColumn<MeasurementRow>[] = [
    { key: 'data', header: 'Data', cell: (row) => <span className="tabular-nums text-text-secondary">{formatDate(row.concluidaEm)}</span> },
    { key: 'ot', header: 'OT', cell: (row) => isAdmin ? <Link to={`/work-orders/${row.otId}`} className="font-medium text-primary underline">{row.otCodigo}</Link> : <span className="font-medium text-text-primary">{row.otCodigo}</span> },
    { key: 'item', header: 'Item', cell: (row) => <span className="text-text-primary">{row.item.descricao}</span> },
    { key: 'valor', header: 'Valor', align: 'right', cell: (row) => <span className="tabular-nums text-text-primary">{formatValue(row.item)}</span> },
    { key: 'unidade', header: 'Unidade', hideBelow: 'sm', cell: (row) => <span className="text-text-secondary">{row.item.unidade ?? '—'}</span> },
    { key: 'faixa', header: 'Faixa esperada', hideBelow: 'md', cell: (row) => <span className="tabular-nums text-text-secondary">{formatRange(row.item)}</span> },
    { key: 'resultado', header: 'Resultado', cell: (row) => <ResultBadge item={row.item} /> },
  ]

  return <section aria-labelledby="equipment-measurements" className="space-y-3">
    <h3 id="equipment-measurements" className="text-sm font-semibold text-text-primary">Medições registradas</h3>
    <FilterBar label="Filtros do histórico de medições">
      <Select size="sm" aria-label="Filtrar por item" value={itemId} onChange={(next) => update({ mitem: next })} options={itemOptions} />
      <Checkbox label="Incluir itens sem medição" checked={withEmpty} onCheckedChange={(checked) => update({ msem: checked ? '1' : undefined })} />
      <FilterRange
        from={<DatePicker size="sm" aria-label="Período: de" value={from} max={to || undefined} onChange={(next) => update({ mde: next })} />}
        to={<DatePicker size="sm" aria-label="Período: até" value={to} min={from || undefined} onChange={(next) => update({ mate: next })} />}
      />
    </FilterBar>
    <p className="text-[11px] text-text-muted">Os filtros valem para as execuções carregadas nesta página. A faixa esperada é a do item atual; o resultado foi gravado na época da medição.</p>
    {chartRows.length > 0 ? <TrendChart rows={chartRows} /> : null}
    <DataTable
      label="Histórico de medições do equipamento"
      columns={columns}
      rows={rows}
      getRowId={(row) => row.key}
      minWidth="640px"
      isLoading={query.isLoading}
      loadingLabel="Carregando medições"
      error={query.isError && !query.data ? { message: 'Não foi possível carregar o histórico de medições.', onRetry: () => void query.refetch() } : null}
      empty={{
        icon: <History aria-hidden="true" />,
        title: hasFilter ? 'Nenhuma medição com esses filtros' : 'Nenhuma medição registrada',
        description: hasFilter ? 'Ajuste o item ou o período, ou mude de página.' : 'As medições aparecem aqui depois que uma OT com checklist é concluída.',
        action: hasFilter ? <button type="button" onClick={() => update({ mitem: undefined, mde: undefined, mate: undefined })} className="text-xs text-primary underline">Limpar filtros</button> : undefined,
      }}
      pagination={{ page, size, total, onPageChange: (next) => update({ mpagina: next > 1 ? String(next) : undefined }, true), onSizeChange: (next) => update({ mtamanho: next === 10 ? undefined : String(next) }) }}
    />
  </section>
}
