import { AlertCircle, ArrowLeft, CalendarClock, ClipboardCheck, Gauge, MapPin, UserRound, Wrench } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useEquipment, useHospitals, useSectorsForHospitals } from '@/features/assets/api/assets'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { Modal } from '@/components/ui/Modal'
import { useTenantUsers, useUserHospitalLinks } from '@/features/tenants-users/api/users'
import { useReassignWorkOrderTechnician, useWorkOrder, useWorkOrderChecklistItems } from '../api/work-orders'
import { Select } from '@/components/ui/Select'
import { getAuthState } from '@/features/auth/session'
import { WorkOrderPhotosSection } from '../components/WorkOrderPhotosSection'

const statusLabels: Record<string, string> = { AGENDADA: 'Agendada', EM_EXECUCAO: 'Em execução', EM_ANDAMENTO: 'Em andamento', CONCLUIDA: 'Concluída', CONCLUIDO: 'Concluída', CANCELADA: 'Cancelada', CANCELADO: 'Cancelada' }

function canonical(value: string) { return value.toLocaleUpperCase('pt-BR').replaceAll('Ç', 'C').replaceAll('Ã', 'A') }
function statusStyle(value: string) {
  const status = canonical(value)
  if (status === 'AGENDADA') return 'border-warning/30 bg-warning/10 text-warning'
  if (status === 'EM_EXECUCAO' || status === 'EM_ANDAMENTO') return 'border-primary/30 bg-primary/10 text-primary'
  if (status === 'CANCELADA' || status === 'CANCELADO') return 'border-border bg-bg text-text-muted'
  if (status === 'CONCLUIDA' || status === 'CONCLUIDO') return 'border-primary/30 bg-primary/10 text-primary'
  return 'border-border bg-bg text-text-secondary'
}
function formatDate(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return '—'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}
function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: string; code?: string } } }).response
    return response?.data?.detail ?? response?.data?.code ?? 'A OT não existe ou você não tem acesso a ela.'
  }
  return 'A OT não existe ou você não tem acesso a ela.'
}

export function WorkOrderDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const order = useWorkOrder(id)
  const checklist = useWorkOrderChecklistItems(order.data?.checklistId, !order.isLoading && !order.isError)
  const equipment = useEquipment(order.data?.equipamentoId ?? '')
  const hospitals = useHospitals()
  const sectors = useSectorsForHospitals(hospitals.data?.map(({ id: hospitalId }) => hospitalId) ?? [])
  const users = useTenantUsers()
  const hospitalLinks = useUserHospitalLinks(users.data ?? [])
  const reassign = useReassignWorkOrderTechnician(id)
  const [isReassignOpen, setIsReassignOpen] = useState(false)
  const [tecnicoId, setTecnicoId] = useState('')

  const sector = sectors.data?.find((item) => item.id === equipment.data?.setorId)
  const hospital = hospitals.data?.find((item) => item.id === sector?.hospitalId)
  const activeTechnicians = useMemo(() => (users.data ?? []).flatMap((user, index) => {
    if (user.role !== 'tecnico' || !user.ativo) return []
    const assignedHospitals = hospitalLinks[index]?.data ?? []
    return assignedHospitals.includes(sector?.hospitalId ?? '') ? [user] : []
  }), [hospitalLinks, sector?.hospitalId, users.data])
  const currentTechnician = users.data?.find((user) => user.id === order.data?.tecnicoId)
  const items = [...(checklist.data ?? [])].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
  const hasExecutionState = items.length > 0 && items.every((item) => typeof item.concluido === 'boolean')
  const completedItems = hasExecutionState ? items.filter((item) => item.concluido).length : 0
  const progress = hasExecutionState ? Math.round((completedItems / items.length) * 100) : 0

  async function submitReassignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!tecnicoId || !activeTechnicians.some((technician) => technician.id === tecnicoId)) return
    try {
      await reassign.mutateAsync(tecnicoId)
      toast.success('Técnico responsável atualizado.')
      setIsReassignOpen(false)
    } catch {
      // Keep the dialog open to allow correction or retry.
    }
  }

  if (order.isLoading) return <AdminPageShell title="Ordens de Trabalho" subtitle="Detalhe da ordem"><DetailSkeleton /></AdminPageShell>
  if (order.isError || !order.data) return <AdminPageShell title="Ordens de Trabalho" subtitle="Detalhe da ordem"><section role="alert" className="grid min-h-64 place-items-center rounded-lg border border-border bg-surface p-8 text-center"><div><h2 className="text-base font-semibold text-text-primary">Não foi possível carregar esta OT</h2><p className="mt-2 max-w-md text-sm text-text-secondary">{getErrorMessage(order.error)}</p><div className="mt-4 flex justify-center gap-2"><button type="button" onClick={() => void order.refetch()} className="h-9 rounded-md border border-border px-3 text-xs font-medium text-text-primary hover:bg-bg">Tentar novamente</button><button type="button" onClick={() => navigate('/work-orders')} className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand">Voltar à lista</button></div></div></section></AdminPageShell>

  return <AdminPageShell title="Ordens de Trabalho" subtitle="Detalhe e execução">
    <div className="space-y-4">
      <Link to="/work-orders" className="inline-flex items-center gap-2 text-xs font-medium text-text-secondary outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-primary"><ArrowLeft aria-hidden="true" size={15} />Voltar às ordens</Link>

      <section className="rounded-lg border border-border bg-surface p-5 xl:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><p className="text-xs text-text-muted">Ordem de Trabalho</p><span className={`rounded-md border px-2 py-1 text-[10px] font-semibold ${statusStyle(order.data.status)}`}>{statusLabels[canonical(order.data.status)] ?? order.data.status.replaceAll('_', ' ')}</span><span className="rounded-md border border-border bg-bg px-2 py-1 text-[10px] text-text-secondary">{canonical(order.data.tipo) === 'PREVENTIVA' ? 'Preventiva' : canonical(order.data.tipo) === 'CORRETIVA' ? 'Corretiva' : order.data.tipo}</span></div>
            <h2 className="mt-3 text-xl font-semibold text-text-primary">{order.data.codigo}</h2>
            <p className="mt-1 text-xs text-text-muted">ID {order.data.id}</p>
          </div>
          <button type="button" onClick={() => { setTecnicoId(order.data.tecnicoId ?? ''); setIsReassignOpen(true) }} className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-xs font-semibold text-text-primary hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><UserRound aria-hidden="true" size={14} />Reatribuir técnico</button>
        </div>
        <div className="mt-5 grid gap-4 border-t border-border pt-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metadata icon={<Wrench size={14} />} label="Equipamento" value={equipment.data ? `${equipment.data.codigo} · ${equipment.data.nome}` : order.data.equipamentoId} />
          <Metadata icon={<MapPin size={14} />} label="Hospital / setor" value={`${hospital?.nome ?? '—'}${sector?.nome ? ` · ${sector.nome}` : ''}`} />
          <Metadata icon={<UserRound size={14} />} label="Técnico responsável" value={currentTechnician?.nome ?? '—'} />
          <Metadata icon={<CalendarClock size={14} />} label="Agendada para" value={formatDate(order.data.dataAgendada)} />
          <Metadata icon={<CalendarClock size={14} />} label="Iniciada em" value={formatDate(order.data.iniciadaEm)} />
          <Metadata icon={<CalendarClock size={14} />} label="Concluída em" value={formatDate(order.data.concluidaEm)} />
          <Metadata icon={<MapPin size={14} />} label="Local" value={order.data.local ?? '—'} />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section aria-labelledby="checklist-title" className="rounded-lg border border-border bg-surface p-5">
          <div className="flex items-center justify-between gap-3"><h3 id="checklist-title" className="flex items-center gap-2 text-sm font-semibold text-text-primary"><ClipboardCheck aria-hidden="true" size={16} />Checklist</h3>{hasExecutionState && <span className="text-xs font-medium text-text-secondary">{completedItems}/{items.length} itens</span>}</div>
          {order.data.checklistId ? checklist.isLoading ? <div aria-busy="true" className="mt-4 h-24 animate-pulse rounded-md bg-bg" /> : checklist.isError ? <div role="alert" className="mt-4 rounded-md border border-border p-4 text-xs text-text-secondary">Não foi possível carregar os itens do checklist.<button type="button" onClick={() => void checklist.refetch()} className="ml-2 text-primary underline">Tentar novamente</button></div> : items.length === 0 ? <p className="mt-4 rounded-md border border-dashed border-border px-4 py-6 text-center text-xs text-text-muted">Este checklist não possui itens cadastrados.</p> : <>
            {hasExecutionState ? <div className="mt-4"><div role="progressbar" aria-label="Progresso do checklist" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={completedItems} className="h-2 overflow-hidden rounded-full bg-bg"><div className="h-full bg-primary transition-[width]" style={{ width: `${progress}%` }} /></div><p className="mt-2 text-[11px] text-text-secondary">{progress}% concluído</p></div> : <p className="mt-3 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-text-secondary">Itens disponíveis; o estado de preenchimento ainda não é retornado pela API.</p>}
            <ul className="mt-4 divide-y divide-border">{items.map((item) => <li key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"><span aria-hidden="true" className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded border ${typeof item.concluido === 'boolean' ? item.concluido ? 'border-primary bg-primary text-bg-brand' : 'border-border' : 'border-border bg-bg'}`}>{item.concluido ? '✓' : ''}</span><span className="min-w-0 flex-1 text-xs text-text-primary">{item.descricao || 'Item sem descrição'}{item.obrigatorio && <span className="ml-2 text-[10px] text-warning">Obrigatório</span>}</span>{typeof item.concluido !== 'boolean' && <span className="text-[10px] text-text-muted">Sem estado</span>}</li>)}</ul>
          </> : canonical(order.data.tipo) === 'CORRETIVA' ? <p className="mt-4 rounded-md border border-warning/30 bg-warning/5 px-4 py-3 text-xs text-text-secondary">Esta OT corretiva não possui checklist original. O checklist ad-hoc não foi retornado pela API.</p> : <p className="mt-4 rounded-md border border-dashed border-border px-4 py-6 text-center text-xs text-text-muted">Nenhum checklist vinculado a esta OT.</p>}
        </section>

        <section aria-labelledby="measurements-title" className="rounded-lg border border-border bg-surface p-5">
          <h3 id="measurements-title" className="flex items-center gap-2 text-sm font-semibold text-text-primary"><Gauge aria-hidden="true" size={16} />Medições registradas</h3>
          <UnavailableMessage>O backend ainda não disponibiliza uma consulta de medições associadas à OT.</UnavailableMessage>
        </section>

        {canonical(order.data.tipo) === 'PREVENTIVA' ? <WorkOrderPhotosSection order={order.data} user={getAuthState().user} /> : null}

        <section aria-labelledby="timeline-title" className="rounded-lg border border-border bg-surface p-5 xl:col-span-2">
          <h3 id="timeline-title" className="text-sm font-semibold text-text-primary">Linha do tempo</h3>
          <UnavailableMessage>O backend ainda não disponibiliza o histórico de transições desta OT.</UnavailableMessage>
        </section>
      </div>
    </div>

    {isReassignOpen && <Modal title="Reatribuir técnico" description="A alteração solicita apenas o novo responsável; o status da OT não é enviado." busy={reassign.isPending} onClose={() => setIsReassignOpen(false)}>
      <form className="space-y-4" onSubmit={(event) => void submitReassignment(event)}>
        <label className="grid gap-1.5 text-xs font-medium text-text-secondary">Técnico responsável<Select required value={tecnicoId} onChange={setTecnicoId} placeholder="Selecione um técnico" options={[...(currentTechnician && !activeTechnicians.some((user) => user.id === currentTechnician.id) ? [{ value: currentTechnician.id, label: `${currentTechnician.nome} (responsável atual)` }] : []), ...activeTechnicians.map((user) => ({ value: user.id, label: user.nome }))]} /></label>
        {!sector && <p role="alert" className="text-xs text-warning">Não foi possível identificar o hospital do equipamento para validar o vínculo dos técnicos.</p>}
        {users.isError || hospitalLinks.some((query) => query.isError) ? <p role="alert" className="text-xs text-danger">Não foi possível carregar os técnicos vinculados.</p> : null}
        {reassign.isError && <p role="alert" className="text-xs text-danger">{getErrorMessage(reassign.error)}</p>}
        <div className="flex justify-end gap-2 border-t border-border pt-4"><button type="button" disabled={reassign.isPending} onClick={() => setIsReassignOpen(false)} className="h-9 rounded-md border border-border px-3 text-xs font-medium text-text-secondary hover:bg-bg">Cancelar</button><button type="submit" disabled={!tecnicoId || !sector || (!activeTechnicians.some((user) => user.id === tecnicoId) && tecnicoId !== order.data.tecnicoId) || tecnicoId === order.data.tecnicoId || reassign.isPending} className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand disabled:cursor-not-allowed disabled:opacity-50">{reassign.isPending ? 'Salvando…' : 'Salvar responsável'}</button></div>
      </form>
    </Modal>}
  </AdminPageShell>
}

function Metadata({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="min-w-0"><p className="flex items-center gap-1.5 text-[11px] text-text-muted">{icon}{label}</p><p className="mt-1 truncate text-xs font-medium text-text-primary" title={value}>{value}</p></div>
}

function UnavailableMessage({ children }: { children: ReactNode }) {
  return <p className="mt-4 flex items-start gap-2 rounded-md border border-dashed border-border px-4 py-5 text-xs leading-5 text-text-muted"><AlertCircle aria-hidden="true" size={15} className="mt-0.5 shrink-0" />{children}</p>
}

function DetailSkeleton() {
  return <div aria-label="Carregando ordem de trabalho" aria-busy="true" className="space-y-4"><div className="h-48 animate-pulse rounded-lg border border-border bg-surface" /><div className="grid gap-4 xl:grid-cols-2"><div className="h-64 animate-pulse rounded-lg border border-border bg-surface" /><div className="h-64 animate-pulse rounded-lg border border-border bg-surface" /></div></div>
}
