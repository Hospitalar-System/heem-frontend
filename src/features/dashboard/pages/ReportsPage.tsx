import { Download, FileSpreadsheet, FileText, RotateCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { useHospitals, useSectors } from '@/features/assets/api/assets'
import { useReportBacklog, useReportExport, useReportIndicators, useReportTopEquipment, useRequestReportExport, useRiskCompliance } from '../api/reports'
import type { ExportRequest, ReportFilters, ReportGrouping } from '../api/reports'
import { ReportBacklog } from '../components/ReportBacklog'
import { ReportGroups } from '../components/ReportGroups'
import { ReportIndicatorCards } from '../components/ReportIndicatorCards'
import { ReportTopEquipment } from '../components/ReportTopEquipment'
import { formatPercent, getErrorMessage } from '../components/report-format'
import { SectionError, SectionSkeleton } from '../components/report-ui'
import { Select } from '@/components/ui/Select'
import { DatePicker } from '@/components/ui/DatePicker'

type ExportContent = ExportRequest['conteudo']
type ExportFormat = ExportRequest['formato']

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
  const [conteudo, setConteudo] = useState<ExportContent>('chamados')
  const [exportId, setExportId] = useState<string | null>(null)
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
  const requestExport = useRequestReportExport()
  const exportStatus = useReportExport(exportId)
  const invalidRange = !desde || !ate || desde > ate
  const metrics = indicators.data

  async function handleExport(formato: ExportFormat) {
    if (invalidRange) return
    try {
      const result = await requestExport.mutateAsync({ ...filters, conteudo, formato })
      setExportId(result.id)
    } catch {
      // Mutation error is surfaced in the page without rejecting the click handler.
    }
  }

  const exportMessage = exportStatus.data?.status === 'pendente'
    ? 'Exportação em processamento.'
    : exportStatus.data?.status === 'falhou'
      ? 'Não foi possível gerar a exportação.'
      : exportStatus.data?.status === 'concluido'
        ? exportStatus.data.urlDownload ? 'Arquivo pronto para download.' : 'Exportação concluída, mas o link de download não foi fornecido.'
        : null

  return (
    <AdminPageShell title="Relatórios & Indicadores" subtitle="Indicadores de manutenção e conformidade">
      <div className="space-y-5">
        <section aria-label="Filtros do relatório" className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-xs text-text-secondary">
            <span>Desde</span>
            <DatePicker size="sm" required aria-label="Data inicial" value={desde} max={ate || undefined} onChange={setDesde} />
          </label>
          <label className="grid gap-1 text-xs text-text-secondary">
            <span>Até</span>
            <DatePicker size="sm" required aria-label="Data final" value={ate} min={desde || undefined} onChange={setAte} />
          </label>
          <label className="grid min-w-40 gap-1 text-xs text-text-secondary">
            <span>Hospital</span>
            <Select size="sm" aria-label="Hospital" value={hospitalId} onChange={(next) => { setHospitalId(next); setSetorId('') }} options={[{ value: '', label: 'Todos' }, ...(hospitals.data ?? []).map((hospital) => ({ value: hospital.id, label: hospital.nome }))]} />
          </label>
          <label className="grid min-w-40 gap-1 text-xs text-text-secondary">
            <span>Setor</span>
            <Select size="sm" aria-label="Setor" value={setorId} disabled={!hospitalId} onChange={setSetorId} options={[{ value: '', label: 'Todos' }, ...(sectors.data ?? []).map((sector) => ({ value: sector.id, label: sector.nome }))]} />
          </label>
          <label className="grid min-w-40 gap-1 text-xs text-text-secondary">
            <span>Agrupar por</span>
            <Select size="sm" aria-label="Agrupar por" value={agrupar} onChange={(next) => setAgrupar(next as ReportGrouping)} options={[{ value: 'hospital', label: 'Hospital' }, { value: 'setor', label: 'Setor' }]} />
          </label>
          <div className="ml-auto flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-xs text-text-secondary">
              <span>Conteúdo</span>
              <Select size="sm" aria-label="Conteúdo da exportação" value={conteudo} onChange={(next) => setConteudo(next as ExportContent)} options={[{ value: 'INDICADORES', label: 'Indicadores' }, { value: 'chamados', label: 'Chamados' }, { value: 'ordens_trabalho', label: 'Ordens de trabalho' }, { value: 'medicoes', label: 'Medições' }]} />
            </label>
            <button type="button" aria-label="Exportar Excel" disabled={invalidRange || requestExport.isPending} onClick={() => void handleExport('xlsx')} className="inline-flex h-[38px] items-center gap-2 rounded-md border border-border bg-surface px-3 text-xs font-medium text-text-primary outline-none hover:bg-bg focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50">
              <FileSpreadsheet aria-hidden="true" size={14} /> Excel
            </button>
            <button type="button" aria-label="Exportar PDF" disabled={invalidRange || requestExport.isPending} onClick={() => void handleExport('pdf')} className="inline-flex h-[38px] items-center gap-2 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand outline-none hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50">
              <FileText aria-hidden="true" size={14} /> PDF
            </button>
          </div>
        </section>

        {invalidRange && <p role="alert" className="text-xs text-danger">Informe um período válido: a data inicial deve ser anterior ou igual à data final.</p>}
        {requestExport.isError && <p role="alert" className="text-xs text-danger">{getErrorMessage(requestExport.error, 'Falha ao solicitar exportação.')}</p>}
        {requestExport.isPending && <div role="status" className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-secondary"><RotateCw aria-hidden="true" className="animate-spin text-primary" size={14} />Solicitando exportação…</div>}
        {exportStatus.isError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-text-primary"><span>Não foi possível consultar o andamento da exportação.</span><button type="button" onClick={() => void exportStatus.refetch()} className="rounded-md border border-border bg-surface px-3 py-1.5 font-medium outline-none hover:bg-bg focus-visible:ring-2 focus-visible:ring-primary">Tentar novamente</button></div>}
        {exportMessage && (
          <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-secondary">
            <span>{exportMessage}</span>
            {exportStatus.data?.status === 'pendente' && <RotateCw aria-hidden="true" className="animate-spin text-primary" size={14} />}
            {exportStatus.data?.status === 'concluido' && exportStatus.data.urlDownload && <a href={exportStatus.data.urlDownload} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline"><Download aria-hidden="true" size={14} /> Baixar arquivo</a>}
          </div>
        )}

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
