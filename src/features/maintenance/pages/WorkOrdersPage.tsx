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
import { Select } from '@/components/ui/Select'
import { PageAction } from '@/components/ui/PageAction'
import { FilterBar, FilterRange } from '@/components/ui/FilterBar'
import { DatePicker } from '@/components/ui/DatePicker'
import { DateTimePicker } from '@/components/ui/DateTimePicker'

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

  return <AdminPageShell title="Ordens de Trabalho" subtitle="Planejamento e acompanhamento da manutenção" action={<PageAction icon={ClipboardPlus} onClick={() => { resetForm(); setIsCreateOpen(true) }} collapseLabelOnMobile>Nova OT</PageAction>}>
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-text-secondary">{orders.data?.length ?? 0} ordem(ns) carregada(s)</p>
      </div>

      <FilterBar label="Filtros de ordens de trabalho">
        <label className="relative min-w-0 sm:col-span-2"><span className="sr-only">Buscar ordens</span><Search aria-hidden="true" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" /><input type="search" aria-label="Buscar ordens" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Código, equipamento ou setor" className={`${inputClass} w-full pl-8`} /></label>
        <Select size="sm" aria-label="Filtrar por status" value={statusFilter} onChange={setStatusFilter} options={[{ value: '', label: 'Todos os status' }, { value: 'AGENDADA', label: 'Agendada' }, { value: 'EM_EXECUCAO', label: 'Em execução' }, { value: 'CONCLUIDA', label: 'Concluída' }, { value: 'CANCELADA', label: 'Cancelada' }]} />
        <label className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-bg px-3 text-xs text-text-secondary"><input type="checkbox" checked={onlyOverdue} onChange={(event) => setOnlyOverdue(event.target.checked)} className="size-4 accent-warning" />Atrasadas</label>
        <Select size="sm" aria-label="Filtrar por tipo" value={typeFilter} onChange={setTypeFilter} options={[{ value: '', label: 'Todos os tipos' }, { value: 'PREVENTIVA', label: 'Preventiva' }, { value: 'CORRETIVA', label: 'Corretiva' }]} />
        <Select size="sm" aria-label="Filtrar por técnico" value={technicianFilter} onChange={setTechnicianFilter} options={[{ value: '', label: 'Todos os técnicos' }, ...(users.data ?? []).filter((user) => user.role === 'tecnico').map((user) => ({ value: user.id, label: user.nome }))]} />
        <FilterRange from={<DatePicker size="sm" aria-label="Data inicial" value={dateFrom} max={dateTo || undefined} onChange={setDateFrom} />} to={<DatePicker size="sm" aria-label="Data final" value={dateTo} min={dateFrom || undefined} onChange={setDateTo} />} />
      </FilterBar>

      {orders.isLoading && <div aria-label="Carregando ordens de trabalho" aria-busy="true" className="overflow-hidden rounded-lg border border-border bg-surface p-4"><span className="sr-only">Carregando ordens.</span><div className="mb-3 h-9 animate-pulse rounded-md bg-bg" />{Array.from({ length: 6 }, (_, index) => <div key={index} className="my-2 h-12 animate-pulse rounded-md bg-bg" />)}</div>}
      {orders.isError && <section role="alert" className="rounded-lg border border-border bg-surface p-8 text-center"><p className="text-sm text-text-primary">Não foi possível carregar as ordens de trabalho.</p><button type="button" onClick={() => void orders.refetch()} className="mt-3 rounded-md px-3 py-2 text-xs font-medium text-primary hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Tentar novamente</button></section>}
      {!orders.isLoading && !orders.isError && visibleOrders.length === 0 && <section className="grid min-h-56 place-items-center rounded-lg border border-dashed border-border bg-surface p-8 text-center"><div><h2 className="text-sm font-semibold text-text-primary">{(orders.data?.length ?? 0) ? 'Nenhuma OT encontrada' : 'Nenhuma ordem de trabalho registrada'}</h2><p className="mt-1 text-xs text-text-secondary">{(orders.data?.length ?? 0) ? 'Ajuste os filtros para consultar outras ordens.' : 'As ordens criadas para este tenant aparecerão aqui.'}</p>{filtersActive && <button type="button" onClick={() => { setSearch(''); setStatusFilter(''); setTypeFilter(''); setTechnicianFilter(''); setDateFrom(''); setDateTo(''); setOnlyOverdue(false) }} className="mt-3 rounded-md px-3 py-2 text-xs font-medium text-primary hover:bg-bg">Limpar filtros</button>}</div></section>}
      {!orders.isLoading && !orders.isError && visibleOrders.length > 0 && <section aria-label="Lista de ordens de trabalho" className="overflow-x-auto rounded-lg border border-border bg-surface"><table className="w-full min-w-[860px] border-collapse text-left"><thead><tr className="table-head h-10 text-[10px] uppercase"><th scope="col" className="px-4">OT</th><th scope="col" className="px-4">Tipo</th><th scope="col" className="px-4">Equipamento</th><th scope="col" className="px-4">Técnico</th><th scope="col" className="px-4">Setor</th><th scope="col" className="px-4">Vencimento</th><th scope="col" className="px-4">Status</th></tr></thead><tbody>{visibleOrders.map((order) => {
        const equip = equipmentById.get(order.equipamentoId)
        const sector = equip ? sectorById.get(equip.setorId) : undefined
        const technician = users.data?.find((user) => user.id === order.tecnicoId)
        const openOrder = () => navigate(`/work-orders/${order.id}`)
        return <tr key={order.id} role="link" tabIndex={0} aria-label={`Abrir ${order.codigo || order.id}`} onClick={(event) => { if (!(event.target as HTMLElement).closest('a,button')) openOrder() }} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openOrder() } }} className="h-12 row-clickable border-b border-border/70 text-xs last:border-0"><td className="px-4"><Link to={`/work-orders/${order.id}`} className="font-semibold text-text-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{order.codigo || order.id}</Link>{order.planoPreventivoId && <span className="mt-1 block text-[10px] text-text-muted">Plano preventivo</span>}</td><td className="px-4 text-text-secondary">{normalized(order.tipo) === 'PREVENTIVA' ? 'Preventiva' : normalized(order.tipo) === 'CORRETIVA' ? 'Corretiva' : order.tipo || '—'}</td><td className="px-4"><span className="block font-medium text-text-primary">{equip?.nome ?? '—'}</span><span className="text-[10px] text-text-muted">{equip?.codigo ?? ''}</span></td><td className="px-4 text-text-secondary">{technician?.nome ?? '—'}</td><td className="px-4 text-text-secondary">{sector?.nome ?? '—'}</td><td className="px-4 text-text-secondary">{formatDate(order.dataAgendada)}</td><td className="px-4"><div className="flex flex-wrap items-center gap-1.5"><span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-medium ${statusClass(order.status)}`}>{statusLabel[normalized(order.status)] ?? order.status.replaceAll('_', ' ')}</span>{isOverdue(order) && <span className="inline-flex rounded-md border border-danger/30 bg-danger/10 px-2 py-1 text-[10px] font-medium text-danger">Atrasada</span>}</div></td></tr>
      })}</tbody></table></section>}
    </div>

    {isCreateOpen && <Modal title="Agendar OT preventiva" description="Defina equipamento, checklist, responsável e data." busy={createOrder.isPending} onClose={closeCreateDialog}>
      {dependencyLoading ? <div aria-busy="true" className="space-y-3"><div className="h-9 animate-pulse rounded-md bg-bg" /><div className="h-9 animate-pulse rounded-md bg-bg" /><div className="h-9 animate-pulse rounded-md bg-bg" /></div> : <form className="space-y-3" onSubmit={(event) => void submit(event)}>
        <label className="grid gap-1.5 text-xs font-medium text-text-secondary">Código da OT<input required maxLength={40} value={codigo} onChange={(event) => setCodigo(event.target.value)} placeholder="Ex.: OT-2042" className={`${inputClass} w-full`} /></label>
        <label className="grid gap-1.5 text-xs font-medium text-text-secondary">Equipamento<Select required value={equipamentoId} onChange={(next) => { setEquipamentoId(next); setTecnicoId('') }} placeholder="Selecione um equipamento" options={(equipment.data ?? []).map((item) => ({ value: item.id, label: `${item.codigo} · ${item.nome}` }))} /></label>
        <label className="grid gap-1.5 text-xs font-medium text-text-secondary">Checklist preventivo<Select required value={checklistId} onChange={setChecklistId} placeholder="Selecione um checklist" options={(checklists.data ?? []).filter((item) => item.ativo !== false).map((item) => ({ value: item.id, label: item.nome }))} /></label>
        <label className="grid gap-1.5 text-xs font-medium text-text-secondary">Técnico responsável<Select required disabled={!selectedEquipment} value={tecnicoId} onChange={setTecnicoId} placeholder={selectedEquipment ? 'Selecione um técnico' : 'Selecione primeiro um equipamento'} options={eligibleTechnicians.map((technician) => ({ value: technician.id, label: technician.nome }))} /></label>
        {selectedEquipment && !selectedSector && <p role="alert" className="text-xs text-warning">Não foi possível identificar o hospital deste equipamento para validar os técnicos.</p>}
        {selectedEquipment && selectedSector && eligibleTechnicians.length === 0 && <p className="text-xs text-warning">Não há técnicos ativos vinculados ao hospital do equipamento.</p>}
        {equipment.isError || checklists.isError || users.isError || sectors.isError ? <p role="alert" className="text-xs text-danger">Não foi possível carregar os dados necessários para o agendamento. Feche e tente novamente.</p> : null}
        <label className="grid gap-1.5 text-xs font-medium text-text-secondary">Data agendada<DateTimePicker required label="Data agendada" value={dataAgendada} onChange={setDataAgendada} /></label>
        {createOrder.isError && <p role="alert" className="text-xs text-danger">{errorMessage(createOrder.error)}</p>}
        <div className="flex justify-end gap-2 border-t border-border pt-3"><button type="button" disabled={createOrder.isPending} onClick={closeCreateDialog} className="h-9 rounded-md border border-border px-3 text-xs font-medium text-text-secondary hover:bg-bg">Cancelar</button><button type="submit" disabled={!codigo.trim() || !equipamentoId || !checklistId || !tecnicoId || !dataAgendada || !selectedSector || !eligibleTechnicians.some((technician) => technician.id === tecnicoId) || createOrder.isPending} className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50">{createOrder.isPending ? 'Agendando…' : 'Agendar OT'}</button></div>
      </form>}
    </Modal>}
  </AdminPageShell>
}
