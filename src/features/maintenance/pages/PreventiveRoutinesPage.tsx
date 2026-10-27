import { CalendarClock, Pencil, PowerOff } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { WorkOrdersTabs } from '../components/WorkOrdersTabs'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { PageAction } from '@/components/ui/PageAction'
import { FilterBar } from '@/components/ui/FilterBar'
import { Badge } from '@/components/ui/Badge'
import { usePageClamp, usePaginationParams } from '@/hooks/usePaginationParams'
import { useHospitals, useSectorsForHospitals } from '@/features/assets/api/assets'
import { useCampaigns } from '../api/preventive-campaigns'
import { useDeactivatePreventivePlan, usePlanLookups, usePreventivePlans } from '../api/preventive-plans'
import { NewRoutineModal } from '../components/NewRoutineModal'
import { PreventivePlanFormModal } from '../components/PreventivePlanFormModal'
import type { PreventivePlan } from '../types'
import { campaignApiError, recurrenceLabel } from '../utils/preventive-campaigns'
import { formatPlanDate, planApiError } from '../utils/preventive-plans'
import {
  campaignToRoutine, isRoutineActive, planToRoutine, routineOtsLink, routineScopeLabels, routineSituationLabels, routineSituationTones,
  scopeFromUrl, sortByNextExecution, type Routine,
} from '../utils/routines'
import { type RowAction } from '@/components/ui/RowActionsMenu'
import { DataTable, type DataColumn } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'

const scopeOptions = [{ value: '', label: 'Todos os escopos' }, { value: 'equipamento', label: 'Equipamento' }, { value: 'setor', label: 'Setor' }, { value: 'hospital', label: 'Hospital' }]
const statusOptions = [{ value: 'true', label: 'Ativas' }, { value: 'false', label: 'Inativas' }, { value: '', label: 'Todas as situações' }]
// Na URL: ausente = ativas (padrão), "false" = inativas, "todos" = sem filtro de situação.
const statusFromUrl = (raw: string | null) => (raw === 'false' ? 'false' : raw === 'todos' ? '' : 'true')
const statusToUrl = (value: string) => (value === 'true' ? undefined : value === '' ? 'todos' : value)
const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'

export function PreventiveRoutinesPage() {
  const [searchParams] = useSearchParams()
  const pagination = usePaginationParams()
  const scope = scopeFromUrl(searchParams.get('escopo'))
  const status = statusFromUrl(searchParams.get('status'))
  const equipmentFilter = scope === 'equipamento' ? (searchParams.get('equipamento') ?? '') : ''
  const [formPlan, setFormPlan] = useState<PreventivePlan | 'new' | null>(null)
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [toDeactivate, setToDeactivate] = useState<PreventivePlan | null>(null)
  const [deactivateError, setDeactivateError] = useState('')
  const lookups = usePlanLookups()
  const hospitals = useHospitals()
  const sectors = useSectorsForHospitals(hospitals.data?.map(({ id }) => id) ?? [])
  const wantsPlans = scope === '' || scope === 'equipamento'
  const wantsCampaigns = scope !== 'equipamento'
  const plans = usePreventivePlans({ ...pagination.apiParams, equipamentoId: equipmentFilter || undefined, ativo: status === '' ? undefined : status === 'true' }, wantsPlans)
  const campaigns = useCampaigns({}, wantsCampaigns)
  const deactivate = useDeactivatePreventivePlan()

  const equipmentById = useMemo(() => new Map(lookups.equipment.map((item) => [item.id, item])), [lookups.equipment])
  const checklistById = useMemo(() => new Map(lookups.checklists.map((item) => [item.id, item])), [lookups.checklists])
  const userById = useMemo(() => new Map(lookups.users.map((item) => [item.id, item])), [lookups.users])
  const hospitalById = useMemo(() => new Map((hospitals.data ?? []).map((item) => [item.id, item.nome])), [hospitals.data])
  const sectorById = useMemo(() => new Map((sectors.data ?? []).map((item) => [item.id, item.nome])), [sectors.data])

  // Planos: o servidor filtra e pagina (X-Total-Count). Campanhas: o endpoint não pagina; escopo e situação filtram aqui.
  const campaignRoutines = useMemo(() => (campaigns.data ?? []).map(campaignToRoutine).filter((routine) =>
    (scope === '' || routine.scope === scope) && (status === '' || isRoutineActive(routine.situation) === (status === 'true'))), [campaigns.data, scope, status])
  const planRoutines = useMemo(() => (plans.data?.items ?? []).map(planToRoutine), [plans.data])
  const merged = useMemo(() => sortByNextExecution([...(wantsPlans ? planRoutines : []), ...(wantsCampaigns ? campaignRoutines : [])]), [campaignRoutines, planRoutines, wantsCampaigns, wantsPlans])

  // Setor/Hospital: só campanhas, paginadas aqui. Equipamento e Todos: a paginação é a dos planos (servidor).
  const clientPaged = scope === 'setor' || scope === 'hospital'
  const rows = clientPaged ? merged.slice((pagination.page - 1) * pagination.size, pagination.page * pagination.size) : merged
  const total = clientPaged ? merged.length : (plans.data?.total ?? 0)
  const queries = [wantsPlans ? plans : null, wantsCampaigns ? campaigns : null].filter((query) => query !== null)
  const isLoading = queries.some((query) => query.isLoading)
  const failed = queries.filter((query) => query.isError)
  const allLoaded = queries.every((query) => query.isSuccess)
  usePageClamp(pagination, allLoaded ? total : undefined, clientPaged || !plans.isPlaceholderData)
  const filtersActive = Boolean(scope) || Boolean(equipmentFilter) || status !== 'true'
  const forbidden = failed.some((query) => (planApiError(query.error, '').status ?? campaignApiError(query.error, '').status) === 403)
  const planListPaged = scope === '' && (plans.data?.total ?? 0) > pagination.size

  async function confirmDeactivate() {
    if (!toDeactivate) return
    setDeactivateError('')
    try {
      await deactivate.mutateAsync(toDeactivate.id)
      toast.success('Plano preventivo desativado.')
      setToDeactivate(null)
    } catch (error) {
      setDeactivateError(planApiError(error, 'Não foi possível desativar o plano preventivo.').message)
    }
  }

  const planEquipment = (plan: PreventivePlan) => equipmentById.get(plan.equipamentoId)
  const routineName = (routine: Routine) => routine.kind === 'campanha' ? routine.campaign.nome : (planEquipment(routine.plan)?.nome ?? 'equipamento')
  const routineActions = (routine: Routine): RowAction[] => routine.kind === 'plano' && routine.plan.ativo ? [
    { label: 'Editar plano', icon: <Pencil size={14} />, onSelect: () => setFormPlan(routine.plan) },
    { label: 'Desativar plano', icon: <PowerOff size={14} />, destructive: true, onSelect: () => { setDeactivateError(''); setToDeactivate(routine.plan) } },
  ] : []

  const columns: DataColumn<Routine>[] = [
    { key: 'rotina', header: 'Rotina', cell: (routine) => {
      if (routine.kind === 'campanha') return <><Link to={`/work-orders/campanhas/${routine.campaign.id}`} className={`font-medium text-primary hover:underline ${focusRing}`}>{routine.campaign.nome}</Link><span className="block text-[10px] text-text-muted">Campanha · {recurrenceLabel(routine.campaign.recorrencia, routine.campaign.intervalo)}</span></>
      const equipment = planEquipment(routine.plan)
      const { intervaloDias } = routine.plan
      return <><span className="block font-medium text-text-primary">{equipment?.nome ?? '—'}</span><span className="text-[10px] text-text-muted">{equipment?.codigo ?? ''} · Plano · A cada {intervaloDias} {intervaloDias === 1 ? 'dia' : 'dias'}</span>
        {routine.plan.ativo && routine.plan.pendencia && <span title="O técnico padrão está inativo ou desvinculado do hospital; nenhuma OT foi gerada." className="mt-1 block"><StatusBadge tone="warning">Pendência</StatusBadge></span>}</>
    } },
    { key: 'escopo', header: 'Escopo', cell: (routine) => {
      const details = routine.kind === 'campanha'
        ? [[hospitalById.get(routine.campaign.hospitalId), ...(routine.scope === 'setor' ? routine.campaign.setorIds.map((id) => sectorById.get(id)) : [])].filter(Boolean).join(' · ')]
        : [checklistById.get(routine.plan.checklistId)?.nome ?? '', `Técnico ${userById.get(routine.plan.tecnicoPadraoId)?.nome ?? '—'}`]
      return <><Badge variant={routine.scope === 'equipamento' ? 'info' : 'neutral'}>{routineScopeLabels[routine.scope]}</Badge>{details.filter(Boolean).map((detail) => <span key={detail} className="mt-1 block text-[10px] text-text-muted">{detail}</span>)}</>
    } },
    { key: 'proxima', header: 'Próxima execução', cell: (routine) => <span className="text-text-secondary">{routine.next ? formatPlanDate(routine.next) : '—'}</span> },
    { key: 'situacao', header: 'Situação', cell: (routine) => <StatusBadge tone={routineSituationTones[routine.situation]}>{routineSituationLabels[routine.situation]}</StatusBadge> },
    { key: 'progresso', header: 'Progresso', cell: (routine) => <span className="text-text-secondary">{routine.concluidas}/{routine.total} concluídas
      <span role="progressbar" aria-label={`Progresso de ${routineName(routine)}`} aria-valuemin={0} aria-valuemax={routine.total} aria-valuenow={routine.concluidas} className="mt-1 block h-1 w-24 overflow-hidden rounded-full bg-border"><span className="block h-full bg-primary" style={{ width: `${routine.total ? Math.round((routine.concluidas / routine.total) * 100) : 0}%` }} /></span></span> },
    { key: 'ots', header: 'OTs geradas', cell: (routine) => <><span className="block text-text-secondary">{routine.total}</span><Link to={routineOtsLink(routine)} aria-label={`Ver OTs de ${routineName(routine)}`} className={`text-[11px] font-medium text-primary hover:underline ${focusRing}`}>Ver OTs</Link></> },
  ]
  const clearFilters = () => pagination.setFilters({ escopo: undefined, status: undefined, equipamento: undefined })
  const errorMessage = forbidden
    ? 'Acesso não permitido. Apenas o administrador do cliente gerencia rotinas preventivas.'
    : 'Não foi possível carregar as rotinas preventivas.'

  return <AdminPageShell tabs={<WorkOrdersTabs />} title="Rotinas preventivas" subtitle="Manutenção recorrente por equipamento, setor ou hospital" action={<PageAction onClick={() => setIsNewOpen(true)} collapseLabelOnMobile>Nova rotina</PageAction>}>
    <div className="space-y-4">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4 md:p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><CalendarClock aria-hidden="true" size={17} /></span>
          <div><h2 className="text-sm font-semibold text-text-primary">Rotinas recorrentes</h2><p className="mt-1 text-xs text-text-secondary">Planos de equipamento e campanhas de setor ou hospital geram as ordens de trabalho na data prevista.</p></div>
        </div>
      </section>

      <FilterBar label="Filtros de rotinas preventivas">
        <Select size="sm" aria-label="Filtrar por escopo" value={scope} onChange={(next) => pagination.setFilters({ escopo: next, equipamento: undefined })} options={scopeOptions} />
        <Select size="sm" aria-label="Filtrar por situação" value={status} onChange={(next) => pagination.setFilters({ status: statusToUrl(next) })} options={statusOptions} />
        {scope === 'equipamento' && <Select size="sm" aria-label="Filtrar por equipamento" value={equipmentFilter} onChange={(next) => pagination.setFilters({ equipamento: next })} options={[{ value: '', label: 'Todos os equipamentos' }, ...lookups.equipment.map((item) => ({ value: item.id, label: `${item.codigo} · ${item.nome}` }))]} />}
      </FilterBar>

      {planListPaged && <p role="note" className="text-[11px] text-text-muted">A paginação vale para os planos de equipamento; as campanhas aparecem em todas as páginas.</p>}

      <DataTable
        label="Lista de rotinas preventivas"
        columns={columns}
        rows={rows}
        getRowId={(routine) => routine.key}
        rowActions={routineActions}
        rowLabel={(routine) => routine.kind === 'campanha' ? `campanha ${routine.campaign.nome}` : `plano de ${planEquipment(routine.plan) ? `${planEquipment(routine.plan)?.codigo} · ${planEquipment(routine.plan)?.nome}` : 'equipamento'}`}
        minWidth="960px"
        rowHeightClass="h-14"
        isLoading={isLoading}
        loadingLabel="Carregando rotinas preventivas"
        error={failed.length > 0 ? { message: errorMessage, onRetry: forbidden ? undefined : () => failed.forEach((query) => void query.refetch()) } : null}
        empty={allLoaded ? {
          icon: <CalendarClock size={22} />,
          title: filtersActive ? 'Nenhuma rotina encontrada' : 'Nenhuma rotina preventiva cadastrada',
          description: filtersActive ? 'Ajuste os filtros para consultar outras rotinas.' : 'Crie uma rotina para que as OTs preventivas sejam geradas sozinhas a cada ciclo.',
          action: filtersActive
            ? <button type="button" onClick={clearFilters} className={`rounded-md px-3 py-2 text-xs font-medium text-primary hover:bg-bg ${focusRing}`}>Limpar filtros</button>
            : <PageAction onClick={() => setIsNewOpen(true)} fullWidthMobile>Criar rotina</PageAction>,
        } : undefined}
        pagination={{ page: pagination.page, size: pagination.size, total, onPageChange: pagination.setPage, onSizeChange: pagination.setSize }}
      />
    </div>

    {isNewOpen && <NewRoutineModal onClose={() => setIsNewOpen(false)} onPlan={() => { setIsNewOpen(false); setFormPlan('new') }} />}
    {formPlan && <PreventivePlanFormModal plan={formPlan === 'new' ? undefined : formPlan} lookups={lookups} onClose={() => setFormPlan(null)} onStale={() => void plans.refetch()} />}

    {toDeactivate && <Modal title="Desativar plano preventivo" description="Novas OTs deixam de ser geradas. As OTs já geradas e o histórico são mantidos." busy={deactivate.isPending} onClose={() => setToDeactivate(null)}>
      <div className="space-y-3">
        <p className="text-sm text-text-primary">Deseja desativar o plano de <strong>{equipmentById.get(toDeactivate.equipamentoId)?.nome ?? 'este equipamento'}</strong> com o checklist <strong>{checklistById.get(toDeactivate.checklistId)?.nome ?? '—'}</strong>?</p>
        <p className="text-xs text-text-secondary">Depois de desativado, o plano não pode ser reativado nem editado; crie um novo plano se precisar retomar a rotina.</p>
        {deactivateError && <p role="alert" className="text-xs text-danger">{deactivateError}</p>}
        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <button type="button" disabled={deactivate.isPending} onClick={() => setToDeactivate(null)} className="h-9 rounded-md border border-border px-3 text-xs font-medium text-text-secondary hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50">Cancelar</button>
          <button type="button" disabled={deactivate.isPending} onClick={() => void confirmDeactivate()} className="h-9 rounded-md bg-danger px-3 text-xs font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger disabled:cursor-not-allowed disabled:opacity-50">{deactivate.isPending ? 'Desativando…' : 'Desativar plano'}</button>
        </div>
      </div>
    </Modal>}
  </AdminPageShell>
}
