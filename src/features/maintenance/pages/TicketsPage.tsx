import { AlertTriangle, ArrowUpRight, ClipboardPlus, Search, X } from 'lucide-react'
import { useMemo, useState, useSyncExternalStore } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { Modal } from '@/components/ui/Modal'
import { PageAction } from '@/components/ui/PageAction'
import { getAuthState, subscribeAuthState } from '@/features/auth/session'
import { useEquipments, useHospitals, useSectorsForHospitals } from '@/features/assets/api/assets'
import { useTenantUsers, useUserHospitalLinks } from '@/features/tenants-users/api/users'
import { useCreateCorrectiveWorkOrder, useTicketsPage, useUrgentTicketCount } from '../api/tickets'
import { NewTicketModal } from '../components/NewTicketModal'
import { TicketSlaBadge } from '../components/TicketSlaBadge'
import { TICKET_TYPE_NOT_INFORMED, ticketTypeLabel, ticketTypeLabels, ticketTypes, type Ticket, type TicketStatus } from '../types'
import { Select } from '@/components/ui/Select'
import { FilterBar } from '@/components/ui/FilterBar'
import { DatePicker } from '@/components/ui/DatePicker'
import { Pagination } from '@/components/ui/Pagination'
import { DataTable, type DataColumn } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { usePageClamp, usePaginationParams } from '@/hooks/usePaginationParams'
import { DEFAULT_TICKET_SORT, orderingErrorMessage, ticketSortChoicesFor, ticketSortFromUrl } from '../utils/ordering'
import { useOrderingFallback } from '../utils/useOrderingFallback'
import { ticketCode } from '../utils/ticket-code'
import { finalidadeOptions, type Finalidade } from '../utils/finalidade'
import { severityTone, ticketStatusTone } from '@/lib/status-tones'
import { ageLabels, parseAge, parseSituation } from '../utils/ticket-filters'

const inputClass = 'h-9 rounded-md border border-border bg-bg px-3 text-xs text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'
const severityText: Record<string, string> = { CRITICA: 'Crítica', ALTA: 'Alta', MEDIA: 'Média', BAIXA: 'Baixa' }
const statusText: Record<string, string> = { ABERTO: 'Aberto', EM_ANDAMENTO: 'Em andamento', AGUARDANDO_PECA: 'Aguardando peça', AGUARDANDO_PEÇA: 'Aguardando peça', PAUSADO: 'Pausado', RESOLVIDO: 'Resolvido', CANCELADO: 'Cancelado' }

/** Story 25.1: filtro por tipo (inclui "Não informado", chamados sem tipo). */
const typeFilterOptions = [{ value: '', label: 'Todos os tipos' }, ...ticketTypes.map((value) => ({ value, label: ticketTypeLabels[value] })), { value: TICKET_TYPE_NOT_INFORMED, label: 'Não informado' }]

function parseTicketType(value: string | null) {
  return value && (value === TICKET_TYPE_NOT_INFORMED || (ticketTypes as readonly string[]).includes(value)) ? value : ''
}

function canonicalStatus(status: TicketStatus) {
  return status.toLocaleUpperCase('pt-BR').replace('Ç', 'C')
}

function relativeTime(value: string) {
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return '—'
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000))
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours} h`
  const days = Math.floor(hours / 24)
  return `há ${days} dia${days === 1 ? '' : 's'}`
}

export function TicketsPage() {
  const [searchParams] = useSearchParams()
  const auth = useSyncExternalStore(subscribeAuthState, getAuthState, getAuthState)
  const isAdmin = auth.user?.roles.includes('admin_cliente') ?? false
  const [showNewTicket, setShowNewTicket] = useState(false)
  const pagination = usePaginationParams()
  const statusFilter = searchParams.get('status') ?? ''
  const severityFilter = searchParams.get('severidade') ?? ''
  const hospitalFilter = searchParams.get('hospitalId') ?? ''
  const sectorFilter = searchParams.get('setorId') ?? ''
  const equipmentFilter = searchParams.get('equipamentoId') ?? ''
  const sinceFilter = searchParams.get('abertoDe') ?? ''
  const untilFilter = searchParams.get('abertoAte') ?? ''
  const situationFilter = parseSituation(searchParams.get('situacao'))
  const ageFilter = parseAge(searchParams.get('idade'))
  const typeFilter = parseTicketType(searchParams.get('tipo'))
  const invalidDates = Boolean(sinceFilter && untilFilter && sinceFilter > untilFilter)
  const sortChoices = useMemo(() => ticketSortChoicesFor(auth.user?.roles ?? []), [auth.user?.roles])
  const sortValue = ticketSortFromUrl(searchParams.get('ordenar'), searchParams.get('direcao'), sortChoices)
  const sortChoice = sortChoices.find((choice) => choice.value === sortValue) ?? sortChoices[0]
  // Status, severidade, local, datas, pendentes, idade e ordem vão para o servidor; só a busca vale para a página carregada.
  const tickets = useTicketsPage({
    ...pagination.apiParams, status: statusFilter || undefined, severidade: severityFilter || undefined,
    hospitalId: hospitalFilter || undefined, setorId: sectorFilter || undefined, equipamentoId: equipmentFilter || undefined,
    abertoDe: sinceFilter || undefined, abertoAte: invalidDates ? undefined : untilFilter || undefined,
    situacao: situationFilter, idade: ageFilter, tipo: typeFilter || undefined, ordenar: sortChoice.field, direcao: sortChoice.direction,
  })
  const orderingFallback = useOrderingFallback(
    tickets.error, sortValue !== DEFAULT_TICKET_SORT, () => pagination.setFilters({ ordenar: undefined, direcao: undefined }), sortValue,
  )
  const urgent = useUrgentTicketCount()
  const equipment = useEquipments()
  const hospitals = useHospitals()
  const users = useTenantUsers()
  const hospitalLinks = useUserHospitalLinks(users.data ?? [])
  const sectors = useSectorsForHospitals(hospitals.data?.map(({ id }) => id) ?? [])
  const createWorkOrder = useCreateCorrectiveWorkOrder()
  const [search, setSearch] = useState('')
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [codigo, setCodigo] = useState('')
  const [tecnicoId, setTecnicoId] = useState('')
  const [finalidade, setFinalidade] = useState('')

  const equipmentById = useMemo(() => new Map((equipment.data ?? []).map((item) => [item.id, item])), [equipment.data])
  const sectorById = useMemo(() => new Map((sectors.data ?? []).map((item) => [item.id, item])), [sectors.data])
  const hospitalById = useMemo(() => new Map((hospitals.data ?? []).map((item) => [item.id, item])), [hospitals.data])
  const technicians = useMemo(() => (users.data ?? []).flatMap((user, index) => {
    const linkedHospitals = hospitalLinks[index]?.data
    return user.role === 'tecnico' && user.ativo && linkedHospitals
      ? linkedHospitals.map((hospitalId) => ({ ...user, hospitalId }))
      : []
  }), [hospitalLinks, users.data])

  const visibleTickets = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    return (tickets.data?.items ?? [])
      .filter((ticket) => {
        if (!term) return true
        const equip = equipmentById.get(ticket.equipamentoId)
        const hospital = hospitalById.get(ticket.hospitalId)
        const sector = sectorById.get(ticket.setorId)
        return [ticket.codigo, ticket.id, ticket.descricao, equip?.codigo, equip?.nome, hospital?.nome, sector?.nome]
          .some((value) => value?.toLocaleLowerCase('pt-BR').includes(term))
      })
  }, [equipmentById, hospitalById, search, sectorById, tickets.data])

  const total = tickets.data?.total ?? 0
  usePageClamp(pagination, tickets.data?.total, !tickets.isPlaceholderData)
  const urgentOpenCount = urgent.data ?? 0
  const serverFilters = [
    statusFilter && { key: 'status', label: `Status: ${statusText[statusFilter] ?? statusFilter}` },
    severityFilter && { key: 'severidade', label: `Severidade: ${severityText[severityFilter] ?? severityFilter}` },
    hospitalFilter && { key: 'hospitalId', label: `Hospital: ${hospitalById.get(hospitalFilter)?.nome ?? 'selecionado'}` },
    sectorFilter && { key: 'setorId', label: `Setor: ${sectorById.get(sectorFilter)?.nome ?? 'selecionado'}` },
    equipmentFilter && { key: 'equipamentoId', label: `Equipamento: ${equipmentById.get(equipmentFilter) ? `${equipmentById.get(equipmentFilter)?.codigo} · ${equipmentById.get(equipmentFilter)?.nome}` : 'selecionado'}` },
    situationFilter && { key: 'situacao', label: 'Somente pendentes' },
    ageFilter && { key: 'idade', label: `Idade: ${ageLabels[ageFilter]}` },
    typeFilter && { key: 'tipo', label: `Tipo: ${typeFilter === TICKET_TYPE_NOT_INFORMED ? 'Não informado' : ticketTypeLabel(typeFilter)}` },
  ].filter((item): item is { key: string; label: string } => Boolean(item))
  const filtersActive = Boolean(search || serverFilters.length || sinceFilter || untilFilter)
  const clearAll = () => { setSearch(''); pagination.setFilters({ status: undefined, severidade: undefined, hospitalId: undefined, setorId: undefined, equipamentoId: undefined, abertoDe: undefined, abertoAte: undefined, situacao: undefined, idade: undefined, tipo: undefined }) }
  const eligibleTechnicians = selectedTicket
    ? technicians.filter((technician) => technician.hospitalId === selectedTicket.hospitalId)
    : []

  async function submitCorrectiveWorkOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedTicket || !codigo.trim() || !tecnicoId) return
    try {
      const created = await createWorkOrder.mutateAsync({ codigo: codigo.trim(), chamadoId: selectedTicket.id, tecnicoId, ...(finalidade ? { finalidade: finalidade as Finalidade } : {}) })
      toast.success(`OT corretiva ${created.codigo} criada.`)
      setSelectedTicket(null)
      setCodigo('')
      setTecnicoId('')
      setFinalidade('')
    } catch {
      // Keep the dialog open so the operator can correct or retry the request.
    }
  }

  const ticketColumns: DataColumn<Ticket>[] = [
    { key: 'chamado', header: 'Chamado', essential: true, className: 'min-w-[260px] max-w-[400px]', cell: (ticket) => <>
      <Link to={`/tickets/${ticket.id}`} aria-label={`Abrir chamado ${ticketCode(ticket)}`} className="whitespace-nowrap text-sm font-semibold text-text-primary outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-primary">Chamado {ticketCode(ticket)}</Link>
      <p title={ticket.descricao || undefined} className="mt-0.5 line-clamp-2 text-xs leading-5 text-text-secondary">{ticket.descricao || 'Sem descrição'}</p>
    </> },
    { key: 'severidade', header: 'Severidade', cell: (ticket) => <StatusBadge tone={severityTone(ticket.severidade)}>{severityText[ticket.severidade] ?? 'Severidade não informada'}</StatusBadge> },
    { key: 'status', header: 'Status', cell: (ticket) => { const status = canonicalStatus(ticket.status); return <StatusBadge tone={ticketStatusTone(ticket.status)}>{statusText[status] ?? ticket.status}</StatusBadge> } },
    { key: 'sla', header: 'SLA', cell: (ticket) => ticket.slaStatus ? <TicketSlaBadge status={ticket.slaStatus} /> : <span className="text-text-muted" aria-label="Sem SLA">—</span> },
    { key: 'equipamento', header: 'Equipamento', menuLabel: 'Equipamento e local', className: 'w-full min-w-[160px] max-w-0', cell: (ticket) => {
      const equip = equipmentById.get(ticket.equipamentoId)
      const hospital = hospitalById.get(ticket.hospitalId)
      const sector = sectorById.get(ticket.setorId)
      const equipText = equip ? `${equip.codigo} · ${equip.nome}` : 'Equipamento —'
      const localText = `${hospital?.nome ?? 'Hospital —'}${sector?.nome ? ` · ${sector.nome}` : ''}`
      return <>
        <span title={equipText} className="block truncate text-xs font-medium text-text-primary">{equipText}</span>
        <span title={localText} className="block truncate text-[11px] text-text-muted">{localText}</span>
      </>
    } },
    { key: 'aberto', header: 'Aberto em', className: 'whitespace-nowrap', cell: (ticket) => <time dateTime={ticket.abertoEm} title={new Date(ticket.abertoEm).toLocaleString('pt-BR')} className="block text-[11px] tabular-nums text-text-muted"><span className="block text-xs text-text-secondary">{relativeTime(ticket.abertoEm)}</span>{new Date(ticket.abertoEm).toLocaleDateString('pt-BR')}</time> },
    { key: 'acoes', header: '', srHeader: 'Ações', align: 'right', cell: (ticket) => {
      const status = canonicalStatus(ticket.status)
      const canGenerate = status === 'ABERTO' || status === 'AGUARDANDO_PECA'
      // Duas posições fixas e compactas: "Gerar OT" e o ícone de detalhes ficam alinhados em todas as linhas.
      return <div className="flex items-center justify-end gap-1.5">
        {canGenerate
          ? <button type="button" onClick={() => { setSelectedTicket(ticket); setCodigo(''); setTecnicoId(''); setFinalidade(''); setFinalidade('') }} aria-label="Gerar OT corretiva" title="Gerar OT corretiva" className="inline-flex h-8 w-24 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-primary bg-transparent px-2 text-xs font-semibold text-primary hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><ClipboardPlus aria-hidden="true" size={14} />Gerar OT</button>
          : <span aria-hidden="true" className="inline-block h-8 w-24" />}
        <Link to={`/tickets/${ticket.id}`} aria-label={`Detalhes do chamado ${ticketCode(ticket)}`} title="Detalhes" className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-text-secondary hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><ArrowUpRight aria-hidden="true" size={14} /></Link>
      </div>
    } },
  ]
  return <AdminPageShell title="Chamados de Emergência" subtitle="Fila de atendimento do tenant" action={isAdmin ? <PageAction onClick={() => setShowNewTicket(true)} collapseLabelOnMobile>Novo chamado</PageAction> : undefined}>
    <div className="space-y-4">
      {urgentOpenCount > 0 && <section role="status" className="flex items-center gap-3 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3">
        <AlertTriangle aria-hidden="true" size={18} className="shrink-0 text-danger" />
        <p className="text-sm font-medium text-text-primary">{urgentOpenCount} chamado{urgentOpenCount === 1 ? '' : 's'} crítico{urgentOpenCount === 1 ? '' : 's'} ou alto{urgentOpenCount === 1 ? '' : 's'} aguardando atendimento</p>
      </section>}

      <FilterBar label="Filtros de chamados">
        <label className="relative min-w-0 sm:col-span-2">
          <span className="sr-only">Buscar chamados</span><Search aria-hidden="true" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input type="search" aria-label="Buscar chamados" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Chamado, equipamento ou hospital" className={`${inputClass} w-full pl-8`} />
        </label>
        <label className="min-w-0"><span className="sr-only">Filtrar por status</span><Select size="sm" aria-label="Filtrar por status" value={statusFilter} onChange={(next) => pagination.setFilters({ status: next })} options={[{ value: '', label: 'Todos os status' }, { value: 'ABERTO', label: 'Aberto' }, { value: 'EM_ANDAMENTO', label: 'Em andamento' }, { value: 'AGUARDANDO_PECA', label: 'Aguardando peça' }, { value: 'PAUSADO', label: 'Pausado' }, { value: 'RESOLVIDO', label: 'Resolvido' }, { value: 'CANCELADO', label: 'Cancelado' }]} /></label>
        <label className="min-w-0"><span className="sr-only">Ordenar chamados</span><Select size="sm" aria-label="Ordenar chamados" value={sortValue} onChange={(next) => { orderingFallback.dismiss(); const [ordenar, direcao] = next.split(':'); pagination.setFilters(next === DEFAULT_TICKET_SORT ? { ordenar: undefined, direcao: undefined } : { ordenar, direcao }) }} options={sortChoices.map(({ value, label }) => ({ value, label }))} /></label>
        <label className="min-w-0"><span className="sr-only">Filtrar por severidade</span><Select size="sm" aria-label="Filtrar por severidade" value={severityFilter} onChange={(next) => pagination.setFilters({ severidade: next })} options={[{ value: '', label: 'Todas as severidades' }, { value: 'CRITICA', label: 'Crítica' }, { value: 'ALTA', label: 'Alta' }, { value: 'MEDIA', label: 'Média' }, { value: 'BAIXA', label: 'Baixa' }]} /></label>
        <label className="min-w-0"><span className="sr-only">Filtrar por tipo</span><Select size="sm" aria-label="Filtrar por tipo" value={typeFilter} onChange={(next) => pagination.setFilters({ tipo: next })} options={typeFilterOptions} /></label>
      <div id="chamados-colunas" className="flex min-w-0 justify-end sm:col-end-[-1]" />
      </FilterBar>

      <div role="group" aria-label="Aberto entre" className="grid max-w-md grid-cols-2 gap-2">
        <label className="grid min-w-0 gap-1 text-xs text-text-secondary"><span>Aberto de</span><DatePicker size="sm" aria-label="Aberto desde" value={sinceFilter} max={untilFilter || undefined} onChange={(next) => pagination.setFilters({ abertoDe: next || undefined })} /></label>
        <label className="grid min-w-0 gap-1 text-xs text-text-secondary"><span>Até</span><DatePicker size="sm" aria-label="Aberto até" value={untilFilter} min={sinceFilter || undefined} onChange={(next) => pagination.setFilters({ abertoAte: next || undefined })} /></label>
      </div>

      {(serverFilters.length > 0 || sinceFilter || untilFilter) && <section aria-label="Filtros aplicados" className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-text-secondary">Filtros aplicados:</span>
        {serverFilters.map((item) => <button key={item.key} type="button" aria-label={`Remover filtro ${item.label}`} onClick={() => pagination.setFilters({ [item.key]: undefined })} className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 text-text-primary outline-none hover:bg-bg focus-visible:ring-2 focus-visible:ring-primary">{item.label}<X aria-hidden="true" size={12} /></button>)}
        {(sinceFilter || untilFilter) && <span className="inline-flex h-7 items-center rounded-full border border-border bg-surface px-2.5 text-text-primary">Aberto {sinceFilter ? `desde ${sinceFilter.split('-').reverse().join('/')}` : ''}{sinceFilter && untilFilter ? ' ' : ''}{untilFilter ? `até ${untilFilter.split('-').reverse().join('/')}` : ''}</span>}
        <button type="button" onClick={clearAll} className="h-7 rounded-md px-2 font-medium text-primary outline-none hover:bg-bg focus-visible:ring-2 focus-visible:ring-primary">Limpar filtros</button>
      </section>}
      {invalidDates && <p role="alert" className="text-xs text-danger">A data inicial deve ser anterior ou igual à data final.</p>}

      {orderingFallback.message && <p role="alert" className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-text-primary">{orderingFallback.message}</p>}

      <DataTable
        label="Lista de chamados"
        columns={ticketColumns}
        rows={visibleTickets}
        getRowId={(ticket) => ticket.id}
        rowHeightClass="h-16"
        minWidth="820px"
        storageKey="chamados"
        columnsMenuContainerId="chamados-colunas"
        rowClassName={(ticket) => ticket.severidade === 'CRITICA' ? 'shadow-[inset_4px_0_0_var(--danger)]' : ticket.severidade === 'ALTA' ? 'shadow-[inset_4px_0_0_var(--warning)]' : ''}
        isLoading={tickets.isLoading}
        loadingLabel="Carregando chamados"
        error={tickets.isError ? { message: orderingErrorMessage(tickets.error) ?? 'Não foi possível carregar os chamados.', onRetry: () => void tickets.refetch() } : null}
        empty={{
          title: total > 0 || filtersActive ? 'Nenhum chamado encontrado' : 'Nenhum chamado registrado',
          description: total > 0 || filtersActive ? 'Ajuste a busca ou os filtros.' : 'Novos chamados aparecerão aqui quando forem abertos.',
          action: filtersActive ? <button type="button" onClick={clearAll} className="rounded-md px-3 py-2 text-xs font-medium text-primary hover:bg-bg">Limpar filtros</button> : undefined,
        }}
      />
      {!tickets.isLoading && !tickets.isError && <>
        {search && total > 0 && <p className="text-[11px] text-text-muted">A busca filtra apenas os chamados desta página.</p>}
        <Pagination className="rounded-lg border border-border bg-surface" page={pagination.page} size={pagination.size} total={total} onPageChange={pagination.setPage} onSizeChange={pagination.setSize} />
      </>}
    </div>

    {showNewTicket && <NewTicketModal onClose={() => setShowNewTicket(false)} />}
    {selectedTicket && <Modal title="Gerar OT corretiva" description={`Chamado ${ticketCode(selectedTicket)}`} busy={createWorkOrder.isPending} onClose={() => setSelectedTicket(null)}>
        <form className="space-y-4" onSubmit={(event) => void submitCorrectiveWorkOrder(event)}>
          <label className="grid gap-1.5 text-xs font-medium text-text-secondary">Código da OT<input autoFocus required maxLength={40} value={codigo} onChange={(event) => setCodigo(event.target.value)} placeholder="Ex.: OT-2042" className={`${inputClass} w-full`} /></label>
          <label className="grid gap-1.5 text-xs font-medium text-text-secondary">Técnico responsável<Select required value={tecnicoId} onChange={setTecnicoId} placeholder="Selecione um técnico" options={eligibleTechnicians.map((technician) => ({ value: technician.id, label: technician.nome }))} /></label>
          <label className="grid gap-1.5 text-xs font-medium text-text-secondary">Finalidade (opcional)<Select aria-label="Finalidade" value={finalidade} onChange={setFinalidade} options={finalidadeOptions} /></label>
          {!users.isLoading && !hospitalLinks.some((query) => query.isLoading) && eligibleTechnicians.length === 0 && <p className="text-xs text-warning">Não há técnicos ativos vinculados ao hospital deste chamado.</p>}
          {createWorkOrder.isError && <p role="alert" className="text-xs text-danger">{getErrorMessage(createWorkOrder.error)}</p>}
          <div className="flex justify-end gap-2 border-t border-border pt-4"><button type="button" disabled={createWorkOrder.isPending} onClick={() => setSelectedTicket(null)} className="h-9 rounded-md border border-border px-3 text-xs font-medium text-text-secondary hover:bg-bg">Cancelar</button><button type="submit" disabled={!codigo.trim() || !tecnicoId || createWorkOrder.isPending} className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50">{createWorkOrder.isPending ? 'Criando…' : 'Criar OT'}</button></div>
        </form>
    </Modal>}
  </AdminPageShell>
}

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: string; code?: string } } }).response
    return response?.data?.detail ?? response?.data?.code ?? 'Não foi possível gerar a OT corretiva.'
  }
  return 'Não foi possível gerar a OT corretiva.'
}
