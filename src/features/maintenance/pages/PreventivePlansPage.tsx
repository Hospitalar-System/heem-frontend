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
import { Pagination } from '@/components/ui/Pagination'
import { usePageClamp, usePaginationParams } from '@/hooks/usePaginationParams'
import { useDeactivatePreventivePlan, usePlanLookups, usePreventivePlans } from '../api/preventive-plans'
import { PreventivePlanFormModal } from '../components/PreventivePlanFormModal'
import type { PreventivePlan } from '../types'
import { formatPlanDate, planApiError } from '../utils/preventive-plans'
import { RowActionsMenu } from '@/components/ui/RowActionsMenu'
import { Badge } from '@/components/ui/Badge'

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

      {plans.isLoading && <div aria-label="Carregando planos preventivos" aria-busy="true" className="overflow-hidden rounded-lg border border-border bg-surface p-4"><span className="sr-only">Carregando planos.</span><div className="mb-3 h-9 animate-pulse rounded-md bg-bg" />{Array.from({ length: 5 }, (_, index) => <div key={index} className="my-2 h-12 animate-pulse rounded-md bg-bg" />)}</div>}

      {plans.isError && <section role="alert" className="rounded-lg border border-border bg-surface p-8 text-center">
        <p className="text-sm text-text-primary">{forbidden ? 'Acesso não permitido. Apenas o administrador do cliente gerencia planos preventivos.' : 'Não foi possível carregar os planos preventivos.'}</p>
        {!forbidden && <button type="button" onClick={() => void plans.refetch()} className="mt-3 rounded-md px-3 py-2 text-xs font-medium text-primary hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Tentar novamente</button>}
      </section>}

      {plans.data && plans.data.items.length === 0 && <section className="grid min-h-56 place-items-center rounded-lg border border-dashed border-border bg-surface p-8 text-center">
        <div className="max-w-md">
          <span className="mx-auto grid size-10 place-items-center rounded-md bg-bg text-text-secondary"><CalendarClock aria-hidden="true" size={18} /></span>
          <h2 className="mt-3 text-sm font-semibold text-text-primary">{filtersActive ? 'Nenhum plano encontrado' : 'Nenhum plano preventivo cadastrado'}</h2>
          <p className="mt-1 text-xs leading-5 text-text-secondary">{filtersActive ? 'Ajuste os filtros para consultar outros planos.' : 'Crie um plano para que as OTs preventivas sejam geradas sozinhas a cada ciclo.'}</p>
          {filtersActive
            ? <button type="button" onClick={() => pagination.setFilters({ status: undefined, equipamento: undefined })} className="mt-3 rounded-md px-3 py-2 text-xs font-medium text-primary hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Limpar filtros</button>
            : <div className="mt-3 flex justify-center"><PageAction onClick={() => setFormPlan('new')} fullWidthMobile>Cadastrar plano</PageAction></div>}
        </div>
      </section>}

      {plans.data && plans.data.items.length > 0 && <section aria-label="Lista de planos preventivos" className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead><tr className="table-head h-10 text-[10px] uppercase"><th scope="col" className="px-4">Equipamento</th><th scope="col" className="px-4">Checklist</th><th scope="col" className="px-4">Periodicidade</th><th scope="col" className="px-4">Próxima geração</th><th scope="col" className="px-4">Técnico padrão</th><th scope="col" className="px-4">Status</th><th scope="col" className="px-4 text-right">Ações</th></tr></thead>
          <tbody>{plans.data.items.map((plan) => {
            const equipment = equipmentById.get(plan.equipamentoId)
            const label = equipment ? `${equipment.codigo} · ${equipment.nome}` : 'equipamento'
            return <tr key={plan.id} className="row-divider h-14 text-xs">
              <td className="px-4"><span className="block font-medium text-text-primary">{equipment?.nome ?? '—'}</span><span className="text-[10px] text-text-muted">{equipment?.codigo ?? ''}</span></td>
              <td className="px-4 text-text-secondary">{checklistById.get(plan.checklistId)?.nome ?? '—'}</td>
              <td className="px-4 text-text-secondary">A cada {plan.intervaloDias} {plan.intervaloDias === 1 ? 'dia' : 'dias'}<span className="block text-[10px] text-text-muted">Âncora {formatPlanDate(plan.dataAncora)}</span></td>
              <td className="px-4 text-text-secondary">{plan.ativo ? formatPlanDate(plan.proximaData) : '—'}</td>
              <td className="px-4 text-text-secondary">{userById.get(plan.tecnicoPadraoId)?.nome ?? '—'}</td>
              <td className="px-4"><div className="flex flex-wrap items-center gap-1.5">
                <Badge variant={plan.ativo ? 'success' : 'neutral'}>{plan.ativo ? 'Ativo' : 'Inativo'}</Badge>
                {plan.ativo && plan.pendencia && <Badge variant="warning" title="O técnico padrão está inativo ou desvinculado do hospital; nenhuma OT foi gerada.">Pendência</Badge>}
              </div></td>
              <td className="px-4"><div className="flex justify-end">{plan.ativo ? <RowActionsMenu label={`plano de ${label}`} actions={[
                { label: 'Editar plano', icon: <Pencil size={14} />, onSelect: () => setFormPlan(plan) },
                { label: 'Desativar plano', icon: <PowerOff size={14} />, destructive: true, onSelect: () => { setDeactivateError(''); setToDeactivate(plan) } },
              ]} /> : null}</div></td>
            </tr>
          })}</tbody>
        </table>
        <Pagination className="border-t border-border" page={pagination.page} size={pagination.size} total={total} onPageChange={pagination.setPage} onSizeChange={pagination.setSize} />
      </section>}
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
