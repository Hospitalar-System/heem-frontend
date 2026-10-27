import { CalendarClock, ChevronLeft, ChevronRight, Pencil, Plus, PowerOff } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useDeactivatePreventivePlan, usePlanLookups, usePreventivePlans } from '../api/preventive-plans'
import { PreventivePlanFormModal } from '../components/PreventivePlanFormModal'
import type { PreventivePlan } from '../types'
import { formatPlanDate, planApiError } from '../utils/preventive-plans'

const PAGE_SIZE = 20
const statusOptions = [{ value: 'true', label: 'Ativos' }, { value: 'false', label: 'Inativos' }, { value: '', label: 'Todos os status' }]

export function PreventivePlansPage() {
  const [status, setStatus] = useState('true')
  const [equipmentFilter, setEquipmentFilter] = useState('')
  const [page, setPage] = useState(0)
  const [formPlan, setFormPlan] = useState<PreventivePlan | 'new' | null>(null)
  const [toDeactivate, setToDeactivate] = useState<PreventivePlan | null>(null)
  const [deactivateError, setDeactivateError] = useState('')
  const lookups = usePlanLookups()
  const plans = usePreventivePlans({ pagina: page, tamanho: PAGE_SIZE, equipamentoId: equipmentFilter || undefined, ativo: status === '' ? undefined : status === 'true' })
  const deactivate = useDeactivatePreventivePlan()

  const equipmentById = useMemo(() => new Map(lookups.equipment.map((item) => [item.id, item])), [lookups.equipment])
  const checklistById = useMemo(() => new Map(lookups.checklists.map((item) => [item.id, item])), [lookups.checklists])
  const userById = useMemo(() => new Map(lookups.users.map((item) => [item.id, item])), [lookups.users])

  const total = plans.data?.total ?? 0
  const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1)
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

  return <AdminPageShell title="Planos preventivos" subtitle="Manutenção recorrente e geração programada de OTs">
    <div className="space-y-4">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4 md:p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><CalendarClock aria-hidden="true" size={17} /></span>
          <div><h2 className="text-sm font-semibold text-text-primary">Rotinas recorrentes</h2><p className="mt-1 text-xs text-text-secondary">As ordens de trabalho de cada plano são geradas automaticamente na data prevista.</p></div>
        </div>
        <button type="button" onClick={() => setFormPlan('new')} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Plus aria-hidden="true" size={14} />Novo plano</button>
      </section>

      <section aria-label="Filtros de planos preventivos" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Select size="sm" aria-label="Filtrar por status" value={status} onChange={(next) => { setStatus(next); setPage(0) }} options={statusOptions} />
        <Select size="sm" aria-label="Filtrar por equipamento" value={equipmentFilter} onChange={(next) => { setEquipmentFilter(next); setPage(0) }} options={[{ value: '', label: 'Todos os equipamentos' }, ...lookups.equipment.map((item) => ({ value: item.id, label: `${item.codigo} · ${item.nome}` }))]} />
      </section>

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
            ? <button type="button" onClick={() => { setStatus('true'); setEquipmentFilter(''); setPage(0) }} className="mt-3 rounded-md px-3 py-2 text-xs font-medium text-primary hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Limpar filtros</button>
            : <button type="button" onClick={() => setFormPlan('new')} className="mt-3 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Plus aria-hidden="true" size={14} />Novo plano</button>}
        </div>
      </section>}

      {plans.data && plans.data.items.length > 0 && <section aria-label="Lista de planos preventivos" className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead><tr className="table-head h-10 text-[10px] uppercase"><th scope="col" className="px-4">Equipamento</th><th scope="col" className="px-4">Checklist</th><th scope="col" className="px-4">Periodicidade</th><th scope="col" className="px-4">Próxima geração</th><th scope="col" className="px-4">Técnico padrão</th><th scope="col" className="px-4">Status</th><th scope="col" className="px-4 text-right">Ações</th></tr></thead>
          <tbody>{plans.data.items.map((plan) => {
            const equipment = equipmentById.get(plan.equipamentoId)
            const label = equipment ? `${equipment.codigo} · ${equipment.nome}` : 'equipamento'
            return <tr key={plan.id} className="h-14 border-b border-border/70 text-xs last:border-0">
              <td className="px-4"><span className="block font-medium text-text-primary">{equipment?.nome ?? '—'}</span><span className="text-[10px] text-text-muted">{equipment?.codigo ?? ''}</span></td>
              <td className="px-4 text-text-secondary">{checklistById.get(plan.checklistId)?.nome ?? '—'}</td>
              <td className="px-4 text-text-secondary">A cada {plan.intervaloDias} {plan.intervaloDias === 1 ? 'dia' : 'dias'}<span className="block text-[10px] text-text-muted">Âncora {formatPlanDate(plan.dataAncora)}</span></td>
              <td className="px-4 text-text-secondary">{plan.ativo ? formatPlanDate(plan.proximaData) : '—'}</td>
              <td className="px-4 text-text-secondary">{userById.get(plan.tecnicoPadraoId)?.nome ?? '—'}</td>
              <td className="px-4"><div className="flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-medium ${plan.ativo ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border bg-bg text-text-muted'}`}>{plan.ativo ? 'Ativo' : 'Inativo'}</span>
                {plan.ativo && plan.pendencia && <span title="O técnico padrão está inativo ou desvinculado do hospital; nenhuma OT foi gerada." className="inline-flex rounded-md border border-warning/30 bg-warning/10 px-2 py-1 text-[10px] font-medium text-warning">Pendência</span>}
              </div></td>
              <td className="px-4"><div className="flex justify-end gap-1">
                {plan.ativo && <button type="button" aria-label={`Editar plano de ${label}`} onClick={() => setFormPlan(plan)} className="grid size-8 place-items-center rounded-md text-text-secondary hover:bg-bg hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Pencil aria-hidden="true" size={14} /></button>}
                {plan.ativo && <button type="button" aria-label={`Desativar plano de ${label}`} onClick={() => { setDeactivateError(''); setToDeactivate(plan) }} className="grid size-8 place-items-center rounded-md text-text-secondary hover:bg-bg hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><PowerOff aria-hidden="true" size={14} /></button>}
              </div></td>
            </tr>
          })}</tbody>
        </table>
        <nav aria-label="Paginação" className="flex items-center justify-between gap-3 border-t border-border px-4 py-2 text-xs text-text-secondary">
          <span>{total} plano(s) · página {page + 1} de {lastPage + 1}</span>
          <div className="flex gap-1">
            <button type="button" aria-label="Página anterior" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))} className="grid size-8 place-items-center rounded-md hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40"><ChevronLeft aria-hidden="true" size={14} /></button>
            <button type="button" aria-label="Próxima página" disabled={page >= lastPage} onClick={() => setPage((current) => Math.min(lastPage, current + 1))} className="grid size-8 place-items-center rounded-md hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40"><ChevronRight aria-hidden="true" size={14} /></button>
          </div>
        </nav>
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
