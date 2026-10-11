import { useQueries } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertCircle, FileSpreadsheet, FileText, RotateCw } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { apiClient } from '@/lib/axios'
import { useHospitals } from '@/features/assets/api/assets'
import type { Setor } from '@/features/assets/types'
import { useIndicadores } from '../api/reports'
import { reportFiltersSchema } from '../schemas/report-filters.schema'
import type { IndicadoresParams, IndicadoresResponse, ReportFilters } from '../types'

const inputClass = 'h-9 min-w-0 rounded-md border border-border bg-bg px-3 text-xs text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'
const numberFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

export function ReportsPage() {
  const [filters, setFilters] = useState<ReportFilters>(() => initialFilters())
  const validation = reportFiltersSchema.safeParse(filters)
  const hospitals = useHospitals()
  const sectorLists = useQueries({ queries: (hospitals.data ?? []).map((hospital) => ({
    queryKey: ['sectors', hospital.id],
    queryFn: async () => (await apiClient.get<Setor[]>(`/hospitais/${hospital.id}/setores`)).data,
    staleTime: 60_000,
  })) })
  const allSectors = useMemo(() => sectorLists.flatMap((query) => query.data ?? []), [sectorLists])
  const visibleSectors = useMemo(() => filters.hospitalId
    ? allSectors.filter((sector) => sector.hospitalId === filters.hospitalId)
    : allSectors, [allSectors, filters.hospitalId])
  const params = makeParams(filters)
  const indicators = useIndicadores(params, validation.success)
  const selectedHospital = hospitals.data?.find((hospital) => hospital.id === filters.hospitalId)
  const selectedSector = visibleSectors.find((sector) => sector.id === filters.setorId)
  const comparisonHospitalId = filters.hospitalId || selectedSector?.hospitalId || ''
  const comparedHospitals = comparisonHospitalId
    ? ((hospitals.data ?? []).filter((hospital) => hospital.id === comparisonHospitalId))
    : hospitals.data ?? []
  const hospitalMetrics = useQueries({ queries: comparedHospitals.map((hospital) => ({
    queryKey: ['report-indicators', { ...params, hospitalId: hospital.id, setorId: undefined }],
    queryFn: () => apiClient.get<IndicadoresResponse>('/relatorios/indicadores', { params: { ...params, hospitalId: hospital.id } }).then((response) => response.data),
    enabled: validation.success,
    staleTime: 60_000,
  })) })
  const comparedSectors = visibleSectors.filter((sector) => !filters.setorId || sector.id === filters.setorId)
  const sectorMetrics = useQueries({ queries: comparedSectors.map((sector) => ({
    queryKey: ['report-indicators', { ...params, hospitalId: sector.hospitalId, setorId: sector.id }],
    queryFn: () => apiClient.get<IndicadoresResponse>('/relatorios/indicadores', { params: { ...params, hospitalId: sector.hospitalId, setorId: sector.id } }).then((response) => response.data),
    enabled: validation.success,
    staleTime: 60_000,
  })) })

  const allDataQueries = [...hospitalMetrics, ...sectorMetrics]
  const anyMetricsError = indicators.isError || allDataQueries.some((query) => query.isError) || sectorLists.some((query) => query.isError)
  const retry = () => {
    void indicators.refetch()
    void Promise.all(allDataQueries.map((query) => query.refetch()))
    void hospitals.refetch()
    void Promise.all(sectorLists.map((query) => query.refetch()))
  }
  const hasData = hasIndicators(indicators.data)
  const isLoading = hospitals.isLoading || indicators.isLoading || sectorLists.some((query) => query.isLoading)
  const hospitalRows = comparedHospitals.flatMap((hospital, index) => {
    const value = hospitalMetrics[index]?.data
    return value ? [{ id: hospital.id, name: hospital.nome, availability: value.disponibilidadePercentual }] : []
  })
  const sectorRows = comparedSectors.flatMap((sector, index) => {
    const value = sectorMetrics[index]?.data
    return value ? [{ sector, value }] : []
  }).sort((a, b) => (b.value.mtbfHoras ?? -1) - (a.value.mtbfHoras ?? -1))

  function update<K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value, ...(key === 'hospitalId' ? { setorId: '' } : {}) }))
  }

  return <AdminPageShell title="Relatórios & Indicadores" subtitle="Indicadores de manutenção do tenant">
    <div className="space-y-5">
      <section aria-label="Filtros do relatório" className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-3">
        <label className="flex min-w-[145px] flex-1 flex-col gap-1 text-[11px] text-text-secondary">De<input aria-label="Data inicial" type="date" value={filters.startDate} max={filters.endDate || undefined} onChange={(event) => update('startDate', event.target.value)} className={inputClass} /></label>
        <label className="flex min-w-[145px] flex-1 flex-col gap-1 text-[11px] text-text-secondary">Até<input aria-label="Data final" type="date" value={filters.endDate} min={filters.startDate || undefined} onChange={(event) => update('endDate', event.target.value)} className={inputClass} /></label>
        <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-[11px] text-text-secondary">Hospital<select aria-label="Hospital" value={filters.hospitalId} onChange={(event) => update('hospitalId', event.target.value)} className={inputClass}><option value="">Todos os hospitais</option>{(hospitals.data ?? []).map((hospital) => <option key={hospital.id} value={hospital.id}>{hospital.nome}</option>)}</select></label>
        <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-[11px] text-text-secondary">Setor<select aria-label="Setor" value={filters.setorId} onChange={(event) => update('setorId', event.target.value)} disabled={visibleSectors.length === 0} className={inputClass}><option value="">Todos os setores</option>{visibleSectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.nome}</option>)}</select></label>
        <div className="flex gap-2" aria-label="Exportação indisponível">
          <button type="button" disabled title="A exportação de indicadores será disponibilizada pela Story F5.3." className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-xs text-text-muted disabled:cursor-not-allowed disabled:opacity-60"><FileSpreadsheet size={14} /> Excel</button>
          <button type="button" disabled title="A exportação de indicadores será disponibilizada pela Story F5.3." className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-xs text-text-muted disabled:cursor-not-allowed disabled:opacity-60"><FileText size={14} /> PDF</button>
        </div>
      </section>
      {!validation.success && <p role="alert" className="text-xs text-danger">{validation.error.issues[0]?.message}</p>}
      {hospitals.isError && <InlineError message="Não foi possível carregar hospitais para os filtros." onRetry={() => void hospitals.refetch()} />}
      {anyMetricsError && <InlineError message="Alguns indicadores não puderam ser carregados." onRetry={retry} />}

      {isLoading ? <LoadingState /> : null}
      {!isLoading && !anyMetricsError && validation.success && !hasData ? <section className="grid min-h-56 place-items-center rounded-lg border border-dashed border-border bg-surface p-6 text-center"><div><AlertCircle className="mx-auto text-text-muted" size={24} /><h2 className="mt-3 text-sm font-semibold">Sem dados neste período</h2><p className="mt-1 text-xs text-text-secondary">Ajuste as datas ou os filtros para consultar outros indicadores.</p></div></section> : null}
      {!isLoading && validation.success && hasData ? <>
        <section aria-label="Indicadores principais" className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
          <Kpi title="MTBF médio" value={formatHours(indicators.data?.mtbfHoras)} description="Horas entre falhas" />
          <Kpi title="Tempo médio de atendimento" value={formatHours(indicators.data?.tempoMedioAtendimentoHoras)} description="Horas até atendimento" />
          <Kpi title="Tempo médio de resolução" value={formatHours(indicators.data?.tempoMedioResolucaoHoras)} description="Horas até resolução" />
          <Kpi title="Disponibilidade média" value={formatPercent(indicators.data?.disponibilidadePercentual)} description="No período selecionado" />
        </section>
        <section className="grid gap-4 2xl:grid-cols-2">
          <ChartPanel title="Disponibilidade por hospital" description="Percentual agregado no período selecionado">
            {hospitalRows.length ? <div className="h-[250px]" role="img" aria-label={hospitalRows.map((row) => `${row.name}: ${formatPercent(row.availability)}`).join('; ')}><ResponsiveContainer width="100%" height="100%"><BarChart data={hospitalRows} margin={{ top: 8, right: 12, left: -18, bottom: 4 }}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis domain={[0, 100]} unit="%" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip formatter={(value) => [`${numberFormat.format(Number(value))}%`, 'Disponibilidade']} contentStyle={{ background: 'var(--surface)', borderColor: 'var(--border)', borderRadius: 6, color: 'var(--text-primary)' }} /><Bar dataKey="availability" name="Disponibilidade" fill="var(--primary)" radius={[4, 4, 0, 0]}>{hospitalRows.map((row) => <Cell key={row.id} />)}</Bar></BarChart></ResponsiveContainer></div> : <p className="grid h-[250px] place-items-center text-xs text-text-muted">Nenhum hospital disponível para comparação.</p>}
          </ChartPanel>
          <ChartPanel title="MTBF por setor" description="Horas entre falhas por setor">
            {sectorRows.length ? <div className="h-[250px]" role="img" aria-label={sectorRows.map(({ sector, value }) => `${sector.nome}: ${formatHours(value.mtbfHoras)}`).join('; ')}><ResponsiveContainer width="100%" height="100%"><BarChart data={sectorRows.map(({ sector, value }) => ({ id: sector.id, name: sector.nome, mtbf: value.mtbfHoras ?? 0 }))} layout="vertical" margin={{ top: 4, right: 16, left: 20, bottom: 4 }}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} /><XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="name" width={100} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip formatter={(value) => [`${numberFormat.format(Number(value))} h`, 'MTBF']} contentStyle={{ background: 'var(--surface)', borderColor: 'var(--border)', borderRadius: 6, color: 'var(--text-primary)' }} /><Bar dataKey="mtbf" name="MTBF" fill="var(--primary)" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div> : <p className="grid h-[250px] place-items-center text-xs text-text-muted">Nenhum setor disponível para comparação.</p>}
          </ChartPanel>
        </section>
        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="border-b border-border px-4 py-3"><h2 className="text-sm font-semibold">Detalhamento por setor</h2><p className="mt-1 text-[11px] text-text-muted">{selectedHospital?.nome ?? 'Todos os hospitais'}{selectedSector ? ` · ${selectedSector.nome}` : ''} · {formatRange(filters)}</p></div>
          {sectorRows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left"><thead><tr className="border-b border-border text-[10px] uppercase text-text-muted">{['Hospital', 'Setor', 'MTBF', 'Tempo de atendimento', 'Tempo de resolução', 'Disponibilidade'].map((title) => <th key={title} scope="col" className="px-4 py-3 font-medium">{title}</th>)}</tr></thead><tbody>{sectorRows.map(({ sector, value }) => <tr key={sector.id} className="border-b border-border/70 last:border-0"><td className="px-4 py-3 text-xs text-text-secondary">{(hospitals.data ?? []).find((hospital) => hospital.id === sector.hospitalId)?.nome ?? '—'}</td><td className="px-4 py-3 text-xs font-medium">{sector.nome}</td><td className="px-4 py-3 text-xs tabular-nums">{formatHours(value.mtbfHoras)}</td><td className="px-4 py-3 text-xs tabular-nums">{formatHours(value.tempoMedioAtendimentoHoras)}</td><td className="px-4 py-3 text-xs tabular-nums">{formatHours(value.tempoMedioResolucaoHoras)}</td><td className="px-4 py-3 text-xs tabular-nums">{formatPercent(value.disponibilidadePercentual)}</td></tr>)}</tbody></table></div> : <p className="p-5 text-xs text-text-muted">Não há setores para os filtros selecionados.</p>}
        </section>
      </> : null}
      <p className="text-[10px] text-text-muted">Exportação dos indicadores ainda não disponível. Os botões serão habilitados quando a API de relatórios incluir este conteúdo.</p>
    </div>
  </AdminPageShell>
}

function Kpi({ title, value, description }: { title: string; value: string; description: string }) {
  return <article className="min-h-[112px] rounded-lg border border-border bg-surface p-4"><p className="text-xs text-text-secondary">{title}</p><p className="mt-3 text-2xl font-semibold tabular-nums text-text-primary">{value}</p><p className="mt-1 text-[10px] text-text-muted">{description}</p></article>
}

function ChartPanel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="min-w-0 rounded-lg border border-border bg-surface p-4"><div className="mb-3"><h2 className="text-sm font-semibold">{title}</h2><p className="mt-1 text-[10px] text-text-muted">{description}</p></div>{children}</section>
}

function LoadingState() {
  return <div aria-label="Carregando relatórios" aria-busy="true" className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-lg border border-border bg-surface" />)}</div><div className="grid gap-4 2xl:grid-cols-2">{[0, 1].map((index) => <div key={index} className="h-[310px] animate-pulse rounded-lg border border-border bg-surface" />)}</div><div className="h-56 animate-pulse rounded-lg border border-border bg-surface" /><span className="sr-only">Carregando indicadores do período.</span></div>
}

function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-xs"><span className="flex items-center gap-2 text-text-primary"><AlertCircle size={14} className="text-danger" />{message}</span><button type="button" onClick={onRetry} className="inline-flex items-center gap-1 text-primary"><RotateCw size={13} /> Tentar novamente</button></div>
}

function initialFilters(): ReportFilters {
  const now = new Date()
  return { startDate: localDate(new Date(now.getFullYear(), now.getMonth(), 1)), endDate: localDate(now), hospitalId: '', setorId: '' }
}

function localDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }

function makeParams(filters: ReportFilters): IndicadoresParams {
  return { desde: new Date(`${filters.startDate}T00:00:00`).toISOString(), ate: new Date(`${filters.endDate}T23:59:59.999`).toISOString(), ...(filters.hospitalId ? { hospitalId: filters.hospitalId } : {}), ...(filters.setorId ? { setorId: filters.setorId } : {}) }
}

function hasIndicators(data?: IndicadoresResponse) {
  return Boolean(data && (data.mtbfHoras !== null || data.tempoMedioAtendimentoHoras !== null || data.tempoMedioResolucaoHoras !== null || data.qtdOtsPreventivas + data.qtdOtsCorretivas > 0))
}

function formatHours(value?: number | null) { return value == null ? '—' : `${numberFormat.format(value)} h` }
function formatPercent(value?: number | null) { return value == null ? '—' : `${numberFormat.format(value)}%` }
function formatRange(filters: ReportFilters) { return `${new Date(`${filters.startDate}T00:00:00`).toLocaleDateString('pt-BR')} – ${new Date(`${filters.endDate}T00:00:00`).toLocaleDateString('pt-BR')}` }
