import { ClipboardPlus, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { WorkOrdersTabs } from '../components/WorkOrdersTabs'
import { Modal } from '@/components/ui/Modal'
import { useEquipments, useHospitals, useSectors, useSectorsForHospitals } from '@/features/assets/api/assets'
import { useTenantUsers, useUserHospitalLinks } from '@/features/tenants-users/api/users'
import { useChecklists, useCreatePreventiveWorkOrder, useWorkOrdersPage } from '../api/work-orders'
import { useCampaign } from '../api/preventive-campaigns'
import { usePreventivePlan } from '../api/preventive-plans'
import { preventiveWorkOrderSchema } from '../schemas/work-orders.schema'
import { Select } from '@/components/ui/Select'
import { PageAction } from '@/components/ui/PageAction'
import { FilterBar, FilterRange } from '@/components/ui/FilterBar'
import { DatePicker } from '@/components/ui/DatePicker'
import { DateTimePicker } from '@/components/ui/DateTimePicker'
import { Checkbox } from '@/components/ui/Checkbox'
import { Pagination } from '@/components/ui/Pagination'
import { DataTable, type DataColumn } from '@/components/ui/DataTable'
import { StatusBadge, type StatusTone } from '@/components/ui/StatusBadge'
import { usePageClamp, usePaginationParams } from '@/hooks/usePaginationParams'

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
function statusTone(value: string): StatusTone {
  const status = normalized(value)
  if (status === 'AGENDADA') return 'warning'
  if (status === 'EM_EXECUCAO' || status === 'EM_ANDAMENTO') return 'success'
  if (status === 'CANCELADA' || status === 'CANCELADO') return 'danger'
  return 'neutral'
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
  const [searchParams] = useSearchParams()
  const pagination = usePaginationParams()
  // Status, tipo e atrasadas vão para o servidor (e para a URL); busca, técnico e datas valem para a página carregada.
  const statusFilter = searchParams.get('status') ?? ''
  const typeFilter = searchParams.get('tipo') ?? ''
  const onlyOverdue = searchParams.get('atrasadas') === '1'
  // Hospital, setor e rotina (plano/campanha) também vão para o servidor e para a URL (os dois últimos vêm do "Ver OTs" das Rotinas).
  const hospitalFilter = searchParams.get('hospitalId') ?? ''
  const sectorFilter = hospitalFilter ? (searchParams.get('setorId') ?? '') : ''
  const planFilter = searchParams.get('planoPreventivoId') ?? ''
  const campaignFilter = searchParams.get('campanhaPreventivaId') ?? ''
  const orders = useWorkOrdersPage({
    ...pagination.apiParams, status: statusFilter || undefined, tipo: typeFilter || undefined, atrasadas: onlyOverdue,
    hospitalId: hospitalFilter || undefined, setorId: sectorFilter || undefined,
    planoPreventivoId: planFilter || undefined, campanhaPreventivaId: campaignFilter || undefined,
  })
  const equipment = useEquipments()
  const hospitals = useHospitals()
  const filterSectors = useSectors(hospitalFilter)
  const routinePlan = usePreventivePlan(planFilter)
  const routineCampaign = useCampaign(campaignFilter)
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
    return (orders.data?.items ?? []).filter((order) => {
      const equip = equipmentById.get(order.equipamentoId)
      const sector = equip ? sectorById.get(equip.setorId) : undefined
      const fields = [order.codigo, equip?.codigo, equip?.nome, sector?.nome, order.hospitalNome, order.setorNome]
      const when = order.dataAgendada ? Date.parse(order.dataAgendada) : NaN
      return (!term || fields.some((value) => value?.toLocaleLowerCase('pt-BR').includes(term)))
        && (!technicianFilter || order.tecnicoId === technicianFilter)
        && (!dateFrom || (Number.isFinite(when) && when >= Date.parse(`${dateFrom}T00:00:00`)))
        && (!dateTo || (Number.isFinite(when) && when <= Date.parse(`${dateTo}T23:59:59`)))
    })
  }, [dateFrom, dateTo, equipmentById, orders.data, search, sectorById, technicianFilter])

  const total = orders.data?.total ?? 0
  usePageClamp(pagination, orders.data?.total, !orders.isPlaceholderData)

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

  const filtersActive = Boolean(search || statusFilter || typeFilter || technicianFilter || dateFrom || dateTo || onlyOverdue || hospitalFilter || sectorFilter || planFilter || campaignFilter)
  const routineEquipment = routinePlan.data ? equipmentById.get(routinePlan.data.equipamentoId) : undefined
  const routineLabel = campaignFilter
    ? (routineCampaign.data?.nome ?? 'campanha')
    : routineEquipment ? `plano de ${routineEquipment.codigo} · ${routineEquipment.nome}` : 'plano preventivo'
  const dependencyLoading = equipment.isLoading || checklists.isLoading || users.isLoading || sectors.isLoading || hospitalLinks.some((query) => query.isLoading)

  const orderColumns: DataColumn<(typeof visibleOrders)[number]>[] = [
    { key: 'codigo', header: 'OT', cell: (order) => <><Link to={`/work-orders/${order.id}`} className="font-semibold text-text-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{order.codigo || order.id}</Link>{order.planoPreventivoId && <span className="mt-1 block text-[10px] text-text-muted">Plano preventivo</span>}{order.campanhaPreventivaId && <span className="mt-1 block text-[10px] text-text-muted">Campanha</span>}</> },
    { key: 'tipo', header: 'Tipo', cell: (order) => <span className="text-text-secondary">{normalized(order.tipo) === 'PREVENTIVA' ? 'Preventiva' : normalized(order.tipo) === 'CORRETIVA' ? 'Corretiva' : order.tipo || '—'}</span> },
    { key: 'equipamento', header: 'Equipamento', cell: (order) => { const equip = equipmentById.get(order.equipamentoId); return <><span className="block font-medium text-text-primary">{equip?.nome ?? '—'}</span><span className="text-[10px] text-text-muted">{equip?.codigo ?? ''}</span></> } },
    { key: 'tecnico', header: 'Técnico', cell: (order) => <span className="text-text-secondary">{order.tecnicoId ? (users.data?.find((user) => user.id === order.tecnicoId)?.nome ?? '—') : 'Sem responsável'}</span> },
    { key: 'setor', header: 'Hospital / Setor', cell: (order) => {
      const equip = equipmentById.get(order.equipamentoId)
      const sectorName = order.setorNome ?? (equip ? sectorById.get(equip.setorId) : undefined)?.nome ?? '—'
      return <><span className="block text-text-secondary">{sectorName}</span>{order.hospitalNome && <span className="text-[10px] text-text-muted">{order.hospitalNome}</span>}</>
    } },
    { key: 'vencimento', header: 'Vencimento', cell: (order) => <span className="text-text-secondary">{formatDate(order.dataAgendada)}</span> },
    { key: 'status', header: 'Status', cell: (order) => <div className="flex flex-wrap items-center gap-1.5"><StatusBadge tone={statusTone(order.status)}>{statusLabel[normalized(order.status)] ?? order.status.replaceAll('_', ' ')}</StatusBadge>{isOverdue(order) && <StatusBadge tone="danger">Atrasada</StatusBadge>}</div> },
  ]
  return <AdminPageShell tabs={<WorkOrdersTabs />} title="Ordens de Trabalho" subtitle="Planejamento e acompanhamento da manutenção" action={<PageAction icon={ClipboardPlus} onClick={() => { resetForm(); setIsCreateOpen(true) }} collapseLabelOnMobile>Nova OT</PageAction>}>
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-text-secondary">{total} ordem(ns)</p>
      </div>

      <FilterBar label="Filtros de ordens de trabalho">
        <label className="relative min-w-0 sm:col-span-2"><span className="sr-only">Buscar ordens</span><Search aria-hidden="true" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" /><input type="search" aria-label="Buscar ordens" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Código, equipamento ou setor" className={`${inputClass} w-full pl-8`} /></label>
        <Select size="sm" aria-label="Filtrar por status" value={statusFilter} onChange={(next) => pagination.setFilters({ status: next })} options={[{ value: '', label: 'Todos os status' }, { value: 'AGENDADA', label: 'Agendada' }, { value: 'EM_EXECUCAO', label: 'Em execução' }, { value: 'CONCLUIDA', label: 'Concluída' }, { value: 'CANCELADA', label: 'Cancelada' }]} />
        <Checkbox label="Atrasadas" checked={onlyOverdue} onCheckedChange={(next) => pagination.setFilters({ atrasadas: next ? '1' : undefined })} containerClassName="h-9 justify-center rounded-md border border-border bg-bg px-3 text-xs text-text-secondary" />
        <Select size="sm" aria-label="Filtrar por tipo" value={typeFilter} onChange={(next) => pagination.setFilters({ tipo: next })} options={[{ value: '', label: 'Todos os tipos' }, { value: 'PREVENTIVA', label: 'Preventiva' }, { value: 'CORRETIVA', label: 'Corretiva' }]} />
        <Select size="sm" aria-label="Filtrar por técnico" value={technicianFilter} onChange={setTechnicianFilter} options={[{ value: '', label: 'Todos os técnicos' }, ...(users.data ?? []).filter((user) => user.role === 'tecnico').map((user) => ({ value: user.id, label: user.nome }))]} />
        <Select size="sm" aria-label="Filtrar por hospital" value={hospitalFilter} onChange={(next) => pagination.setFilters({ hospitalId: next, setorId: undefined })} options={[{ value: '', label: 'Todos os hospitais' }, ...(hospitals.data ?? []).map((item) => ({ value: item.id, label: item.nome }))]} />
        <Select size="sm" aria-label="Filtrar por setor" disabled={!hospitalFilter} value={sectorFilter} onChange={(next) => pagination.setFilters({ setorId: next })} options={[{ value: '', label: hospitalFilter ? 'Todos os setores' : 'Escolha um hospital' }, ...(filterSectors.data ?? []).map((item) => ({ value: item.id, label: item.nome }))]} />
        <FilterRange from={<DatePicker size="sm" aria-label="Data inicial" value={dateFrom} max={dateTo || undefined} onChange={setDateFrom} />} to={<DatePicker size="sm" aria-label="Data final" value={dateTo} min={dateFrom || undefined} onChange={setDateTo} />} />
      </FilterBar>

      {(planFilter || campaignFilter) && <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-border bg-surface pl-3 pr-1 text-xs text-text-primary">
          Rotina: {routineLabel}
          <button type="button" aria-label="Remover filtro de rotina" onClick={() => pagination.setFilters({ planoPreventivoId: undefined, campanhaPreventivaId: undefined })} className="grid size-6 place-items-center rounded text-text-secondary hover:bg-bg hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><X aria-hidden="true" size={13} /></button>
        </span>
      </div>}

      <DataTable
        label="Lista de ordens de trabalho"
        columns={orderColumns}
        rows={visibleOrders}
        getRowId={(order) => order.id}
        onRowClick={(order) => navigate(`/work-orders/${order.id}`)}
        rowProps={(order) => ({ role: 'link', 'aria-label': `Abrir ${order.codigo || order.id}` })}
        minWidth="860px"
        isLoading={orders.isLoading}
        loadingLabel="Carregando ordens de trabalho"
        error={orders.isError ? { message: 'Não foi possível carregar as ordens de trabalho.', onRetry: () => void orders.refetch() } : null}
        empty={{
          title: total > 0 || filtersActive ? 'Nenhuma OT encontrada' : 'Nenhuma ordem de trabalho registrada',
          description: total > 0 || filtersActive ? 'Ajuste os filtros para consultar outras ordens.' : 'As ordens criadas para este tenant aparecerão aqui.',
          action: filtersActive ? <button type="button" onClick={() => { setSearch(''); setTechnicianFilter(''); setDateFrom(''); setDateTo(''); pagination.setFilters({ status: undefined, tipo: undefined, atrasadas: undefined, hospitalId: undefined, setorId: undefined, planoPreventivoId: undefined, campanhaPreventivaId: undefined }) }} className="rounded-md px-3 py-2 text-xs font-medium text-primary hover:bg-bg">Limpar filtros</button> : undefined,
        }}
      />
      {!orders.isLoading && !orders.isError && <>
        {(search || technicianFilter || dateFrom || dateTo) && total > 0 && <p className="text-[11px] text-text-muted">Busca, técnico e datas filtram apenas as OTs desta página.</p>}
        <Pagination className="rounded-lg border border-border bg-surface" page={pagination.page} size={pagination.size} total={total} onPageChange={pagination.setPage} onSizeChange={pagination.setSize} />
      </>}
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
