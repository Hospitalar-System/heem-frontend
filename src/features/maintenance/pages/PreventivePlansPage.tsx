import { CalendarClock, Pencil, PowerOff } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { WorkOrdersTabs } from '../components/WorkOrdersTabs'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { PageAction } from '@/components/ui/PageAction'
import { FilterBar } from '@/components/ui/FilterBar'
import { usePageClamp, usePaginationParams } from '@/hooks/usePaginationParams'
import { useDeactivatePreventivePlan, usePlanLookups, usePreventivePlans } from '../api/preventive-plans'
import { PreventivePlanFormModal } from '../components/PreventivePlanFormModal'
import type { PreventivePlan } from '../types'
import { formatPlanDate, planApiError } from '../utils/preventive-plans'
import { type RowAction } from '@/components/ui/RowActionsMenu'
import { DataTable, type DataColumn } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'

const statusOptions = [{ value: 'true', label: 'Ativos' }, { value: 'false', label: 'Inativos' }, { value: '', label: 'Todos os status' }]
// Na URL: ausente = ativos (padrão), "false" = inativos, "todos" = sem filtro de status.
const statusFromUrl = (raw: string | null) => (raw === 'false' ? 'false' : raw === 'todos' ? '' : 'true')
const statusToUrl = (value: string) => (value === 'true' ? undefined : value === '' ? 'todos' : value)

export function PreventivePlansPage() {
  const [searchParams] = useSearchParams()
  const pagination = usePaginationParams()
  const status = statusFromUrl(searchParams.get('status'))
  const equipmentFilter = searchParams.get('equipamento') ?? ''
  const [formPlan, setFormPlan] = useState<PreventivePlan | 'new' | null>(null)
  const [toDeactivate, setToDeactivate] = useState<PreventivePlan | null>(null)
  const [deactivateError, setDeactivateError] = useState('')
  const lookups = usePlanLookups()
  const plans = usePreventivePlans({ ...pagination.apiParams, equipamentoId: equipmentFilter || undefined, ativo: status === '' ? undefined : status === 'true' })
  const deactivate = useDeactivatePreventivePlan()

  const equipmentById = useMemo(() => new Map(lookups.equipment.map((item) => [item.id, item])), [lookups.equipment])
  const checklistById = useMemo(() => new Map(lookups.checklists.map((item) => [item.id, item])), [lookups.checklists])
  const userById = useMemo(() => new Map(lookups.users.map((item) => [item.id, item])), [lookups.users])

  const total = plans.data?.total ?? 0
  usePageClamp(pagination, plans.data?.total, !plans.isPlaceholderData)
  const filtersActive = Boolean(equipmentFilter) || status !== 'true'
  const forbidden = plans.isError && planApiError(plans.error, '').status === 403

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

  const planLabel = (plan: PreventivePlan) => {
    const equipment = equipmentById.get(plan.equipamentoId)
    return `plano de ${equipment ? `${equipment.codigo} · ${equipment.nome}` : 'equipamento'}`
  }
  const planActions = (plan: PreventivePlan): RowAction[] => plan.ativo ? [
    { label: 'Editar plano', icon: <Pencil size={14} />, onSelect: () => setFormPlan(plan) },
    { label: 'Desativar plano', icon: <PowerOff size={14} />, destructive: true, onSelect: () => { setDeactivateError(''); setToDeactivate(plan) } },
  ] : []
  const planColumns: DataColumn<PreventivePlan>[] = [
    { key: 'equipamento', header: 'Equipamento', cell: (plan) => { const equipment = equipmentById.get(plan.equipamentoId); return <><span className="block font-medium text-text-primary">{equipment?.nome ?? '—'}</span><span className="text-[10px] text-text-muted">{equipment?.codigo ?? ''}</span></> } },
    { key: 'checklist', header: 'Checklist', cell: (plan) => <span className="text-text-secondary">{checklistById.get(plan.checklistId)?.nome ?? '—'}</span> },
    { key: 'periodicidade', header: 'Periodicidade', cell: (plan) => <span className="text-text-secondary">A cada {plan.intervaloDias} {plan.intervaloDias === 1 ? 'dia' : 'dias'}<span className="block text-[10px] text-text-muted">Âncora {formatPlanDate(plan.dataAncora)}</span></span> },
    { key: 'proxima', header: 'Próxima geração', cell: (plan) => <span className="text-text-secondary">{plan.ativo ? formatPlanDate(plan.proximaData) : '—'}</span> },
    { key: 'tecnico', header: 'Técnico padrão', cell: (plan) => <span className="text-text-secondary">{userById.get(plan.tecnicoPadraoId)?.nome ?? '—'}</span> },
    { key: 'status', header: 'Status', cell: (plan) => <div className="flex flex-wrap items-center gap-1.5">
      <StatusBadge tone={plan.ativo ? 'success' : 'neutral'}>{plan.ativo ? 'Ativo' : 'Inativo'}</StatusBadge>
      {plan.ativo && plan.pendencia && <span title="O técnico padrão está inativo ou desvinculado do hospital; nenhuma OT foi gerada."><StatusBadge tone="warning" size="sm">Pendência</StatusBadge></span>}
    </div> },
  ]
  return <AdminPageShell tabs={<WorkOrdersTabs />} title="Planos preventivos" subtitle="Manutenção recorrente e geração programada de OTs" action={<PageAction onClick={() => setFormPlan('new')} collapseLabelOnMobile>Novo plano</PageAction>}>
    <div className="space-y-4">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4 md:p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><CalendarClock aria-hidden="true" size={17} /></span>
          <div><h2 className="text-sm font-semibold text-text-primary">Rotinas recorrentes</h2><p className="mt-1 text-xs text-text-secondary">As ordens de trabalho de cada plano são geradas automaticamente na data prevista.</p></div>
        </div>
      </section>

      <FilterBar label="Filtros de planos preventivos">
        <Select size="sm" aria-label="Filtrar por status" value={status} onChange={(next) => pagination.setFilters({ status: statusToUrl(next) })} options={statusOptions} />
        <Select size="sm" aria-label="Filtrar por equipamento" value={equipmentFilter} onChange={(next) => pagination.setFilters({ equipamento: next })} options={[{ value: '', label: 'Todos os equipamentos' }, ...lookups.equipment.map((item) => ({ value: item.id, label: `${item.codigo} · ${item.nome}` }))]} />
      </FilterBar>

      <DataTable
        label="Lista de planos preventivos"
        columns={planColumns}
        rows={plans.data?.items ?? []}
        getRowId={(plan) => plan.id}
        rowActions={planActions}
        rowLabel={planLabel}
        minWidth="900px"
        rowHeightClass="h-14"
        isLoading={plans.isLoading}
        loadingLabel="Carregando planos preventivos"
        error={plans.isError ? { message: forbidden ? 'Acesso não permitido. Apenas o administrador do cliente gerencia planos preventivos.' : 'Não foi possível carregar os planos preventivos.', onRetry: forbidden ? undefined : () => void plans.refetch() } : null}
        empty={plans.data ? {
          icon: <CalendarClock size={22} />,
          title: filtersActive ? 'Nenhum plano encontrado' : 'Nenhum plano preventivo cadastrado',
          description: filtersActive ? 'Ajuste os filtros para consultar outros planos.' : 'Crie um plano para que as OTs preventivas sejam geradas sozinhas a cada ciclo.',
          action: filtersActive
            ? <button type="button" onClick={() => pagination.setFilters({ status: undefined, equipamento: undefined })} className="rounded-md px-3 py-2 text-xs font-medium text-primary hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Limpar filtros</button>
            : <PageAction onClick={() => setFormPlan('new')} fullWidthMobile>Cadastrar plano</PageAction>,
        } : undefined}
        pagination={{ page: pagination.page, size: pagination.size, total, onPageChange: pagination.setPage, onSizeChange: pagination.setSize }}
      />
    </div>

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
