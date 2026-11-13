import { useMemo, useRef, useState } from 'react'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { useHospitals, useSectors } from '@/features/assets/api/assets'
import { useReportBacklog, useReportIndicators, useReportTopEquipment, useRiskCompliance } from '../api/reports'
import type { ReportFilters, ReportGrouping } from '../api/reports'
import { ExportBuilder } from '../components/ExportBuilder'
import { ReportBacklog } from '../components/ReportBacklog'
import { ReportGroups } from '../components/ReportGroups'
import { ReportIndicatorCards } from '../components/ReportIndicatorCards'
import { ReportTopEquipment } from '../components/ReportTopEquipment'
import { formatPercent, getErrorMessage } from '../components/report-format'
import { SectionError, SectionSkeleton } from '../components/report-ui'
import { Select } from '@/components/ui/Select'
import { FilterBar } from '@/components/ui/FilterBar'
import { DatePicker } from '@/components/ui/DatePicker'

function dateRange() {
  const now = new Date()
  return {
    desde: new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString(),
    ate: new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)).toISOString(),
  }
}

function dateInputValue(value: string) {
  return value.slice(0, 10)
}

function startOfDay(value: string) {
  return new Date(`${value}T00:00:00.000Z`).toISOString()
}

function endOfDay(value: string) {
  return new Date(`${value}T23:59:59.999Z`).toISOString()
}

const riskLabels: Record<string, string> = {
  CRITICO: 'Crítico',
  SEMI_CRITICO: 'Semicrítico',
  NAO_CRITICO: 'Não crítico',
}

export function ReportsPage() {
  const initialRange = useMemo(dateRange, [])
  const [desde, setDesde] = useState(dateInputValue(initialRange.desde))
  const [ate, setAte] = useState(dateInputValue(initialRange.ate))
  const [hospitalId, setHospitalId] = useState('')
  const [setorId, setSetorId] = useState('')
  const [agrupar, setAgrupar] = useState<ReportGrouping>('hospital')
  const hospitals = useHospitals()
  const sectors = useSectors(hospitalId)
  const filters: ReportFilters = {
    desde: startOfDay(desde),
    ate: endOfDay(ate),
    ...(hospitalId ? { hospitalId } : {}),
    ...(setorId ? { setorId } : {}),
  }
  const indicators = useReportIndicators(filters, agrupar)
  const backlog = useReportBacklog({ ...(hospitalId ? { hospitalId } : {}), ...(setorId ? { setorId } : {}) })
  const topEquipment = useReportTopEquipment(filters)
  const compliance = useRiskCompliance(filters)
  const invalidRange = !desde || !ate || desde > ate
  const metrics = indicators.data
  const filtersRef = useRef<HTMLDivElement>(null)
  const hospitalName = hospitalId ? (hospitals.data ?? []).find((hospital) => hospital.id === hospitalId)?.nome ?? 'Selecionado' : 'Todos'
  const sectorName = setorId ? (sectors.data ?? []).find((sector) => sector.id === setorId)?.nome ?? 'Selecionado' : 'Todos'

  function editFilters() {
    const container = filtersRef.current
    container?.scrollIntoView?.({ block: 'center' })
    container?.querySelector<HTMLElement>('button, input, [role="combobox"]')?.focus()
  }

  return (
    <AdminPageShell title="Relatórios & Indicadores" subtitle="Indicadores de manutenção e conformidade">
      <div className="space-y-5">
        <div ref={filtersRef}>
        <FilterBar label="Filtros do relatório" className="items-end">
          <label className="grid min-w-0 gap-1 text-xs text-text-secondary">
            <span>Desde</span>
            <DatePicker size="sm" required aria-label="Data inicial" value={desde} max={ate || undefined} onChange={setDesde} />
          </label>
          <label className="grid min-w-0 gap-1 text-xs text-text-secondary">
            <span>Até</span>
            <DatePicker size="sm" required aria-label="Data final" value={ate} min={desde || undefined} onChange={setAte} />
          </label>
          <label className="grid min-w-0 gap-1 text-xs text-text-secondary">
            <span>Hospital</span>
            <Select size="sm" aria-label="Hospital" value={hospitalId} onChange={(next) => { setHospitalId(next); setSetorId('') }} options={[{ value: '', label: 'Todos' }, ...(hospitals.data ?? []).map((hospital) => ({ value: hospital.id, label: hospital.nome }))]} />
          </label>
          <label className="grid min-w-0 gap-1 text-xs text-text-secondary">
            <span>Setor</span>
            <Select size="sm" aria-label="Setor" value={setorId} disabled={!hospitalId} onChange={setSetorId} options={[{ value: '', label: 'Todos' }, ...(sectors.data ?? []).map((sector) => ({ value: sector.id, label: sector.nome }))]} />
          </label>
          <label className="grid min-w-0 gap-1 text-xs text-text-secondary">
            <span>Agrupar por</span>
            <Select size="sm" aria-label="Agrupar por" value={agrupar} onChange={(next) => setAgrupar(next as ReportGrouping)} options={[{ value: 'hospital', label: 'Hospital' }, { value: 'setor', label: 'Setor' }]} />
          </label>
        </FilterBar>
        </div>

        {invalidRange && <p role="alert" className="text-xs text-danger">Informe um período válido: a data inicial deve ser anterior ou igual à data final.</p>}
        <ExportBuilder filters={{ desde, ate, hospitalId, setorId, hospitalName, sectorName, invalidRange, onEditFilters: editFilters }} />

        {indicators.isLoading ? <ReportSkeleton /> : indicators.isError ? (
          <ReportError message={getErrorMessage(indicators.error, 'Não foi possível carregar os indicadores.')} onRetry={() => void indicators.refetch()} />
        ) : metrics && (
          <>
            <ReportIndicatorCards metrics={metrics} />
            <ReportGroups groups={metrics.grupos ?? []} grouping={agrupar} />
          </>
        )}

        {compliance.isLoading ? <ReportSkeleton /> : compliance.isError ? (
          <ReportError message={getErrorMessage(compliance.error, 'Não foi possível carregar a conformidade.')} onRetry={() => void compliance.refetch()} />
        ) : (
          <section aria-labelledby="compliance-title" className="rounded-lg border border-border bg-surface p-4 xl:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div><h2 id="compliance-title" className="text-sm font-semibold text-text-primary">Conformidade por nível de risco</h2><p className="mt-1 text-xs text-text-muted">Percentual conforme e medições no período</p></div>
            </div>
            {compliance.data?.length ? <div className="grid gap-x-8 gap-y-4 md:grid-cols-3">
              {compliance.data.map((item) => <div key={item.nivelRisco}>
                <div className="mb-2 flex items-baseline justify-between gap-2"><span className="text-xs font-medium text-text-secondary">{riskLabels[item.nivelRisco] ?? item.nivelRisco}</span><span className="text-sm font-semibold text-text-primary">{formatPercent(item.percentualConforme)}</span></div>
                <div role="progressbar" aria-label={`Conformidade ${riskLabels[item.nivelRisco] ?? item.nivelRisco}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.percentualConforme ?? 0} className="h-2 overflow-hidden rounded-full bg-bg"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, item.percentualConforme ?? 0))}%` }} /></div>
                <p className="mt-1.5 text-[11px] text-text-muted">{item.totalMedicoes.toLocaleString('pt-BR')} medições</p>
              </div>)}
            </div> : <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-xs text-text-muted">Nenhuma medição encontrada para os filtros selecionados.</p>}
          </section>
        )}


        {backlog.isLoading ? <SectionSkeleton label="Carregando backlog" /> : backlog.isError ? (
          <SectionError message={getErrorMessage(backlog.error, 'Não foi possível carregar o backlog.')} onRetry={() => void backlog.refetch()} />
        ) : backlog.data && <ReportBacklog backlog={backlog.data} />}

        {topEquipment.isLoading ? <SectionSkeleton label="Carregando equipamentos com mais chamados" /> : topEquipment.isError ? (
          <SectionError message={getErrorMessage(topEquipment.error, 'Não foi possível carregar os equipamentos com mais chamados.')} onRetry={() => void topEquipment.refetch()} />
        ) : topEquipment.data && <ReportTopEquipment items={topEquipment.data} />}
      </div>
    </AdminPageShell>
  )
}

function ReportSkeleton() {
  return <div aria-label="Carregando indicadores" aria-busy="true" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"><span className="sr-only">Carregando indicadores do relatório.</span>{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-[126px] animate-pulse rounded-lg border border-border bg-surface" />)}</div>
}

function ReportError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <SectionError message={message} onRetry={onRetry} />
}
