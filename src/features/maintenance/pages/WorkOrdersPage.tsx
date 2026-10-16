import { ClipboardPlus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { Modal } from '@/components/ui/Modal'
import { useEquipments, useHospitals, useSectorsForHospitals } from '@/features/assets/api/assets'
import { useTenantUsers, useUserHospitalLinks } from '@/features/tenants-users/api/users'
import { useChecklists, useCreatePreventiveWorkOrder, useWorkOrders } from '../api/work-orders'
import { preventiveWorkOrderSchema } from '../schemas/work-orders.schema'

const inputClass = 'h-9 rounded-md border border-border bg-bg px-3 text-xs text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'
const statusLabel: Record<string, string> = {
  AGENDADA: 'Agendada', EM_EXECUCAO: 'Em execução', EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída', CONCLUIDO: 'Concluída', CANCELADA: 'Cancelada', CANCELADO: 'Cancelada',
}

function normalized(value: string) { return value.toLocaleUpperCase('pt-BR').replaceAll('Ç', 'C').replaceAll('Ã', 'A') }
function formatDate(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return '—'
  return new Intl.DateTimeFormat('pt-BR').format(new Date(value))
}
function statusClass(value: string) {
  const status = normalized(value)
  if (status === 'AGENDADA') return 'border-warning/30 bg-warning/10 text-warning'
  if (status === 'EM_EXECUCAO' || status === 'EM_ANDAMENTO') return 'border-primary/30 bg-primary/10 text-primary'
  if (status === 'CANCELADA' || status === 'CANCELADO') return 'border-danger/30 bg-danger/10 text-danger'
  return 'border-border bg-bg text-text-secondary'
}
function isOverdue(order: { status: string; dataAgendada: string | null; atrasada?: boolean }) {
  if (typeof order.atrasada === 'boolean') return order.atrasada
  const status = normalized(order.status)
  return ['AGENDADA', 'EM_EXECUCAO', 'EM_ANDAMENTO'].includes(status)
    && Boolean(order.dataAgendada)
    && Date.parse(order.dataAgendada ?? '') < Date.now()
}
function errorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: string; code?: string } } }).response
    return response?.data?.detail ?? response?.data?.code ?? 'Não foi possível criar a OT preventiva.'
  }
  return 'Não foi possível criar a OT preventiva.'
}

export function WorkOrdersPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [onlyOverdue, setOnlyOverdue] = useState(false)
  const orders = useWorkOrders(onlyOverdue)
  const equipment = useEquipments()
  const hospitals = useHospitals()
  const sectors = useSectorsForHospitals(hospitals.data?.map(({ id }) => id) ?? [])
  const users = useTenantUsers()
  const hospitalLinks = useUserHospitalLinks(users.data ?? [])
  const checklists = useChecklists()
  const createOrder = useCreatePreventiveWorkOrder()
  const [isCreateOpen, setIsCreateOpen] = useState(location.pathname === '/work-orders/new')
  const [codigo, setCodigo] = useState('')
  const [equipamentoId, setEquipamentoId] = useState('')
  const [checklistId, setChecklistId] = useState('')
  const [tecnicoId, setTecnicoId] = useState('')
  const [dataAgendada, setDataAgendada] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [technicianFilter, setTechnicianFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    if (location.pathname !== '/work-orders/new') return
    setIsCreateOpen(true)
    const requestedEquipmentId = new URLSearchParams(location.search).get('equipamentoId')
    if (requestedEquipmentId) setEquipamentoId(requestedEquipmentId)
  }, [location.pathname, location.search])

  const equipmentById = useMemo(() => new Map((equipment.data ?? []).map((item) => [item.id, item])), [equipment.data])
  const sectorById = useMemo(() => new Map((sectors.data ?? []).map((item) => [item.id, item])), [sectors.data])
  const technicianLinks = useMemo(() => (users.data ?? []).flatMap((user, index) => {
    const links = hospitalLinks[index]?.data
    return user.role === 'tecnico' && user.ativo && links
      ? links.map((hospitalId) => ({ id: user.id, nome: user.nome, hospitalId }))
      : []
  }), [hospitalLinks, users.data])
  const selectedEquipment = equipmentById.get(equipamentoId)
  const selectedSector = selectedEquipment ? sectorById.get(selectedEquipment.setorId) : undefined
  const eligibleTechnicians = selectedSector
    ? technicianLinks.filter((technician) => technician.hospitalId === selectedSector.hospitalId)
    : []

  const visibleOrders = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    return (orders.data ?? []).filter((order) => {
      const equip = equipmentById.get(order.equipamentoId)
      const sector = equip ? sectorById.get(equip.setorId) : undefined
      const fields = [order.codigo, equip?.codigo, equip?.nome, sector?.nome]
      const when = order.dataAgendada ? Date.parse(order.dataAgendada) : NaN
      return (!term || fields.some((value) => value?.toLocaleLowerCase('pt-BR').includes(term)))
        && (!statusFilter || normalized(order.status) === statusFilter)
        && (!typeFilter || normalized(order.tipo) === typeFilter)
        && (!technicianFilter || order.tecnicoId === technicianFilter)
        && (!onlyOverdue || isOverdue(order))
        && (!dateFrom || (Number.isFinite(when) && when >= Date.parse(`${dateFrom}T00:00:00`)))
        && (!dateTo || (Number.isFinite(when) && when <= Date.parse(`${dateTo}T23:59:59`)))
    }).sort((a, b) => (a.dataAgendada ?? '').localeCompare(b.dataAgendada ?? ''))
  }, [dateFrom, dateTo, equipmentById, onlyOverdue, orders.data, search, sectorById, statusFilter, technicianFilter, typeFilter])

  function resetForm() {
    setCodigo(''); setEquipamentoId(''); setChecklistId(''); setTecnicoId(''); setDataAgendada('')
  }

  function closeCreateDialog() {
    setIsCreateOpen(false)
    resetForm()
    if (location.pathname === '/work-orders/new') navigate('/work-orders', { replace: true })
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = preventiveWorkOrderSchema.safeParse({ codigo, equipamentoId, checklistId, tecnicoId, dataAgendada })
    if (!parsed.success) return
    if (!eligibleTechnicians.some((technician) => technician.id === tecnicoId)) return
    try {
      const created = await createOrder.mutateAsync({ ...parsed.data, dataAgendada: new Date(parsed.data.dataAgendada).toISOString() })
      toast.success(`OT preventiva ${created.codigo} agendada.`)
      closeCreateDialog()
    } catch {
      // Preserve the form so the operator can correct or retry the request.
    }
  }

  const filtersActive = Boolean(search || statusFilter || typeFilter || technicianFilter || dateFrom || dateTo || onlyOverdue)
  const dependencyLoading = equipment.isLoading || checklists.isLoading || users.isLoading || sectors.isLoading || hospitalLinks.some((query) => query.isLoading)

  return <AdminPageShell title="Ordens de Trabalho" subtitle="Planejamento e acompanhamento da manutenção">
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-text-secondary">{orders.data?.length ?? 0} ordem(ns) carregada(s)</p>
        <button type="button" onClick={() => { resetForm(); setIsCreateOpen(true) }} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><ClipboardPlus aria-hidden="true" size={14} />Nova OT</button>
      </div>

      <section aria-label="Filtros de ordens de trabalho" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
        <label className="relative sm:col-span-2 xl:col-span-2"><span className="sr-only">Buscar ordens</span><Search aria-hidden="true" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" /><input type="search" aria-label="Buscar ordens" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Código, equipamento ou setor" className={`${inputClass} w-full pl-8`} /></label>
        <select aria-label="Filtrar por status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputClass}><option value="">Todos os status</option><option value="AGENDADA">Agendada</option><option value="EM_EXECUCAO">Em execução</option><option value="CONCLUIDA">Concluída</option><option value="CANCELADA">Cancelada</option></select>
        <label className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-bg px-3 text-xs text-text-secondary"><input type="checkbox" checked={onlyOverdue} onChange={(event) => setOnlyOverdue(event.target.checked)} className="size-4 accent-warning" />Atrasadas</label>
        <select aria-label="Filtrar por tipo" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className={inputClass}><option value="">Todos os tipos</option><option value="PREVENTIVA">Preventiva</option><option value="CORRETIVA">Corretiva</option></select>
        <select aria-label="Filtrar por técnico" value={technicianFilter} onChange={(event) => setTechnicianFilter(event.target.value)} className={inputClass}><option value="">Todos os técnicos</option>{(users.data ?? []).filter((user) => user.role === 'tecnico').map((user) => <option key={user.id} value={user.id}>{user.nome}</option>)}</select>
        <label className="grid grid-cols-2 gap-2 sm:col-span-2 xl:col-span-6 xl:grid-cols-[auto_180px_auto_180px]"><span className="self-center text-xs text-text-secondary">Período</span><input type="date" aria-label="Data inicial" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className={inputClass} /><span className="self-center text-xs text-text-secondary">até</span><input type="date" aria-label="Data final" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className={inputClass} /></label>
      </section>

      {orders.isLoading && <div aria-label="Carregando ordens de trabalho" aria-busy="true" className="overflow-hidden rounded-lg border border-border bg-surface p-4"><span className="sr-only">Carregando ordens.</span><div className="mb-3 h-9 animate-pulse rounded-md bg-bg" />{Array.from({ length: 6 }, (_, index) => <div key={index} className="my-2 h-12 animate-pulse rounded-md bg-bg" />)}</div>}
      {orders.isError && <section role="alert" className="rounded-lg border border-border bg-surface p-8 text-center"><p className="text-sm text-text-primary">Não foi possível carregar as ordens de trabalho.</p><button type="button" onClick={() => void orders.refetch()} className="mt-3 rounded-md px-3 py-2 text-xs font-medium text-primary hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Tentar novamente</button></section>}
      {!orders.isLoading && !orders.isError && visibleOrders.length === 0 && <section className="grid min-h-56 place-items-center rounded-lg border border-dashed border-border bg-surface p-8 text-center"><div><h2 className="text-sm font-semibold text-text-primary">{(orders.data?.length ?? 0) ? 'Nenhuma OT encontrada' : 'Nenhuma ordem de trabalho registrada'}</h2><p className="mt-1 text-xs text-text-secondary">{(orders.data?.length ?? 0) ? 'Ajuste os filtros para consultar outras ordens.' : 'As ordens criadas para este tenant aparecerão aqui.'}</p>{filtersActive && <button type="button" onClick={() => { setSearch(''); setStatusFilter(''); setTypeFilter(''); setTechnicianFilter(''); setDateFrom(''); setDateTo(''); setOnlyOverdue(false) }} className="mt-3 rounded-md px-3 py-2 text-xs font-medium text-primary hover:bg-bg">Limpar filtros</button>}</div></section>}
      {!orders.isLoading && !orders.isError && visibleOrders.length > 0 && <section aria-label="Lista de ordens de trabalho" className="overflow-x-auto rounded-lg border border-border bg-surface"><table className="w-full min-w-[860px] border-collapse text-left"><thead><tr className="h-10 border-b border-border bg-bg text-[10px] font-medium uppercase text-text-muted"><th scope="col" className="px-4">OT</th><th scope="col" className="px-4">Tipo</th><th scope="col" className="px-4">Equipamento</th><th scope="col" className="px-4">Técnico</th><th scope="col" className="px-4">Setor</th><th scope="col" className="px-4">Vencimento</th><th scope="col" className="px-4">Status</th></tr></thead><tbody>{visibleOrders.map((order) => {
        const equip = equipmentById.get(order.equipamentoId)
        const sector = equip ? sectorById.get(equip.setorId) : undefined
        const technician = users.data?.find((user) => user.id === order.tecnicoId)
        return <tr key={order.id} className="h-12 border-b border-border/70 text-xs last:border-0 hover:bg-bg/60"><td className="px-4"><Link to={`/work-orders/${order.id}`} className="font-semibold text-text-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{order.codigo || order.id}</Link>{order.planoPreventivoId && <span className="mt-1 block text-[10px] text-text-muted">Plano preventivo</span>}</td><td className="px-4 text-text-secondary">{normalized(order.tipo) === 'PREVENTIVA' ? 'Preventiva' : normalized(order.tipo) === 'CORRETIVA' ? 'Corretiva' : order.tipo || '—'}</td><td className="px-4"><span className="block font-medium text-text-primary">{equip?.nome ?? '—'}</span><span className="text-[10px] text-text-muted">{equip?.codigo ?? ''}</span></td><td className="px-4 text-text-secondary">{technician?.nome ?? '—'}</td><td className="px-4 text-text-secondary">{sector?.nome ?? '—'}</td><td className="px-4 text-text-secondary">{formatDate(order.dataAgendada)}</td><td className="px-4"><div className="flex flex-wrap items-center gap-1.5"><span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-medium ${statusClass(order.status)}`}>{statusLabel[normalized(order.status)] ?? order.status.replaceAll('_', ' ')}</span>{isOverdue(order) && <span className="inline-flex rounded-md border border-danger/30 bg-danger/10 px-2 py-1 text-[10px] font-medium text-danger">Atrasada</span>}</div></td></tr>
      })}</tbody></table></section>}
    </div>

    {isCreateOpen && <Modal title="Agendar OT preventiva" description="Defina equipamento, checklist, responsável e data." busy={createOrder.isPending} onClose={closeCreateDialog}>
      {dependencyLoading ? <div aria-busy="true" className="space-y-3"><div className="h-9 animate-pulse rounded-md bg-bg" /><div className="h-9 animate-pulse rounded-md bg-bg" /><div className="h-9 animate-pulse rounded-md bg-bg" /></div> : <form className="space-y-3" onSubmit={(event) => void submit(event)}>
        <label className="grid gap-1.5 text-xs font-medium text-text-secondary">Código da OT<input required maxLength={40} value={codigo} onChange={(event) => setCodigo(event.target.value)} placeholder="Ex.: OT-2042" className={`${inputClass} w-full`} /></label>
        <label className="grid gap-1.5 text-xs font-medium text-text-secondary">Equipamento<select required value={equipamentoId} onChange={(event) => { setEquipamentoId(event.target.value); setTecnicoId('') }} className={`${inputClass} w-full`}><option value="">Selecione um equipamento</option>{(equipment.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.codigo} · {item.nome}</option>)}</select></label>
        <label className="grid gap-1.5 text-xs font-medium text-text-secondary">Checklist preventivo<select required value={checklistId} onChange={(event) => setChecklistId(event.target.value)} className={`${inputClass} w-full`}><option value="">Selecione um checklist</option>{(checklists.data ?? []).filter((item) => item.ativo !== false).map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
        <label className="grid gap-1.5 text-xs font-medium text-text-secondary">Técnico responsável<select required disabled={!selectedEquipment} value={tecnicoId} onChange={(event) => setTecnicoId(event.target.value)} className={`${inputClass} w-full disabled:opacity-50`}><option value="">{selectedEquipment ? 'Selecione um técnico' : 'Selecione primeiro um equipamento'}</option>{eligibleTechnicians.map((technician) => <option key={technician.id} value={technician.id}>{technician.nome}</option>)}</select></label>
        {selectedEquipment && !selectedSector && <p role="alert" className="text-xs text-warning">Não foi possível identificar o hospital deste equipamento para validar os técnicos.</p>}
        {selectedEquipment && selectedSector && eligibleTechnicians.length === 0 && <p className="text-xs text-warning">Não há técnicos ativos vinculados ao hospital do equipamento.</p>}
        {equipment.isError || checklists.isError || users.isError || sectors.isError ? <p role="alert" className="text-xs text-danger">Não foi possível carregar os dados necessários para o agendamento. Feche e tente novamente.</p> : null}
        <label className="grid gap-1.5 text-xs font-medium text-text-secondary">Data agendada<input required type="datetime-local" value={dataAgendada} onChange={(event) => setDataAgendada(event.target.value)} className={`${inputClass} w-full`} /></label>
        {createOrder.isError && <p role="alert" className="text-xs text-danger">{errorMessage(createOrder.error)}</p>}
        <div className="flex justify-end gap-2 border-t border-border pt-3"><button type="button" disabled={createOrder.isPending} onClick={closeCreateDialog} className="h-9 rounded-md border border-border px-3 text-xs font-medium text-text-secondary hover:bg-bg">Cancelar</button><button type="submit" disabled={!codigo.trim() || !equipamentoId || !checklistId || !tecnicoId || !dataAgendada || !selectedSector || !eligibleTechnicians.some((technician) => technician.id === tecnicoId) || createOrder.isPending} className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50">{createOrder.isPending ? 'Agendando…' : 'Agendar OT'}</button></div>
      </form>}
    </Modal>}
  </AdminPageShell>
}
