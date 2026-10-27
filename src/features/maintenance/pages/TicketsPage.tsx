import { AlertTriangle, ArrowUpRight, ClipboardPlus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { Modal } from '@/components/ui/Modal'
import { useEquipments, useHospitals, useSectorsForHospitals } from '@/features/assets/api/assets'
import { useTenantUsers, useUserHospitalLinks } from '@/features/tenants-users/api/users'
import { useCreateCorrectiveWorkOrder, useTickets } from '../api/tickets'
import { TicketSlaBadge } from '../components/TicketSlaBadge'
import type { Ticket, TicketSeverity, TicketStatus } from '../types'
import { Select } from '@/components/ui/Select'
import { FilterBar } from '@/components/ui/FilterBar'

const inputClass = 'h-9 rounded-md border border-border bg-bg px-3 text-xs text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'
const severityOrder: Record<string, number> = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAIXA: 3 }
const severityText: Record<string, string> = { CRITICA: 'Crítica', ALTA: 'Alta', MEDIA: 'Média', BAIXA: 'Baixa' }
const statusText: Record<string, string> = { ABERTO: 'Aberto', EM_ANDAMENTO: 'Em andamento', AGUARDANDO_PECA: 'Aguardando peça', AGUARDANDO_PEÇA: 'Aguardando peça', RESOLVIDO: 'Resolvido', CANCELADO: 'Cancelado' }

function canonicalStatus(status: TicketStatus) {
  return status.toLocaleUpperCase('pt-BR').replace('Ç', 'C')
}

function severityClass(severity: TicketSeverity) {
  if (severity === 'CRITICA') return 'border-danger/30 bg-danger/10 text-danger'
  if (severity === 'ALTA') return 'border-warning/30 bg-warning/10 text-warning'
  if (severity === 'BAIXA') return 'border-primary/30 bg-primary/10 text-primary'
  return 'border-border bg-bg text-text-secondary'
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
  const tickets = useTickets()
  const equipment = useEquipments()
  const hospitals = useHospitals()
  const users = useTenantUsers()
  const hospitalLinks = useUserHospitalLinks(users.data ?? [])
  const sectors = useSectorsForHospitals(hospitals.data?.map(({ id }) => id) ?? [])
  const createWorkOrder = useCreateCorrectiveWorkOrder()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [codigo, setCodigo] = useState('')
  const [tecnicoId, setTecnicoId] = useState('')

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
    return [...(tickets.data ?? [])]
      .filter((ticket) => !statusFilter || canonicalStatus(ticket.status) === statusFilter)
      .filter((ticket) => !severityFilter || ticket.severidade === severityFilter)
      .filter((ticket) => {
        if (!term) return true
        const equip = equipmentById.get(ticket.equipamentoId)
        const hospital = hospitalById.get(ticket.hospitalId)
        const sector = sectorById.get(ticket.setorId)
        return [ticket.id, ticket.descricao, equip?.codigo, equip?.nome, hospital?.nome, sector?.nome]
          .some((value) => value?.toLocaleLowerCase('pt-BR').includes(term))
      })
      .sort((a, b) => (severityOrder[a.severidade] ?? 4) - (severityOrder[b.severidade] ?? 4) || Date.parse(a.abertoEm) - Date.parse(b.abertoEm))
  }, [equipmentById, hospitalById, search, sectorById, severityFilter, statusFilter, tickets.data])

  const urgentOpenCount = (tickets.data ?? []).filter((ticket) =>
    (ticket.severidade === 'CRITICA' || ticket.severidade === 'ALTA') &&
    ['ABERTO', 'AGUARDANDO_PECA'].includes(canonicalStatus(ticket.status)),
  ).length
  const eligibleTechnicians = selectedTicket
    ? technicians.filter((technician) => technician.hospitalId === selectedTicket.hospitalId)
    : []

  async function submitCorrectiveWorkOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedTicket || !codigo.trim() || !tecnicoId) return
    try {
      const created = await createWorkOrder.mutateAsync({ codigo: codigo.trim(), chamadoId: selectedTicket.id, tecnicoId })
      toast.success(`OT corretiva ${created.codigo} criada.`)
      setSelectedTicket(null)
      setCodigo('')
      setTecnicoId('')
    } catch {
      // Keep the dialog open so the operator can correct or retry the request.
    }
  }

  return <AdminPageShell title="Chamados de Emergência" subtitle="Fila de atendimento do tenant">
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
        <label className="min-w-0"><span className="sr-only">Filtrar por status</span><Select size="sm" aria-label="Filtrar por status" value={statusFilter} onChange={setStatusFilter} options={[{ value: '', label: 'Todos os status' }, { value: 'ABERTO', label: 'Aberto' }, { value: 'EM_ANDAMENTO', label: 'Em andamento' }, { value: 'AGUARDANDO_PECA', label: 'Aguardando peça' }, { value: 'RESOLVIDO', label: 'Resolvido' }, { value: 'CANCELADO', label: 'Cancelado' }]} /></label>
        <label className="min-w-0"><span className="sr-only">Filtrar por severidade</span><Select size="sm" aria-label="Filtrar por severidade" value={severityFilter} onChange={setSeverityFilter} options={[{ value: '', label: 'Todas as severidades' }, { value: 'CRITICA', label: 'Crítica' }, { value: 'ALTA', label: 'Alta' }, { value: 'MEDIA', label: 'Média' }, { value: 'BAIXA', label: 'Baixa' }]} /></label>
      </FilterBar>

      {tickets.isLoading ? <div aria-label="Carregando chamados" aria-busy="true" className="space-y-2 rounded-lg border border-border bg-surface p-4"><span className="sr-only">Carregando chamados.</span>{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-24 animate-pulse rounded-md bg-bg" />)}</div> : null}
      {tickets.isError ? <section role="alert" className="rounded-lg border border-border bg-surface p-8 text-center"><p className="text-sm text-text-primary">Não foi possível carregar os chamados.</p><button type="button" onClick={() => void tickets.refetch()} className="mt-3 rounded-md px-3 py-2 text-xs font-medium text-primary hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Tentar novamente</button></section> : null}
      {!tickets.isLoading && !tickets.isError && visibleTickets.length === 0 ? <section className="grid min-h-56 place-items-center rounded-lg border border-dashed border-border bg-surface p-8 text-center"><div><h2 className="text-sm font-semibold text-text-primary">{(tickets.data?.length ?? 0) ? 'Nenhum chamado encontrado' : 'Nenhum chamado registrado'}</h2><p className="mt-1 text-xs text-text-secondary">{(tickets.data?.length ?? 0) ? 'Ajuste a busca ou os filtros.' : 'Novos chamados aparecerão aqui quando forem abertos.'}</p>{(search || statusFilter || severityFilter) && <button type="button" onClick={() => { setSearch(''); setStatusFilter(''); setSeverityFilter('') }} className="mt-3 rounded-md px-3 py-2 text-xs font-medium text-primary hover:bg-bg">Limpar filtros</button>}</div></section> : null}
      {!tickets.isLoading && !tickets.isError && visibleTickets.length > 0 && <section aria-label="Lista de chamados" className="space-y-2">
        {visibleTickets.map((ticket) => {
          const equip = equipmentById.get(ticket.equipamentoId)
          const sector = sectorById.get(ticket.setorId)
          const hospital = hospitalById.get(ticket.hospitalId)
          const status = canonicalStatus(ticket.status)
          const canGenerate = status === 'ABERTO' || status === 'AGUARDANDO_PECA'
          return <article key={ticket.id} className={`grid gap-4 rounded-lg border bg-surface p-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center ${ticket.severidade === 'CRITICA' ? 'border-l-4 border-l-danger border-y-border border-r-border' : ticket.severidade === 'ALTA' ? 'border-l-4 border-l-warning border-y-border border-r-border' : 'border-border'}`}>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/tickets/${ticket.id}`} aria-label={`Abrir chamado ${ticket.id}`} className="text-sm font-semibold text-text-primary outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-primary">Chamado {ticket.id.slice(0, 8)}</Link>
                <span className={`rounded-md border px-2 py-1 text-[10px] font-medium ${severityClass(ticket.severidade)}`}>{severityText[ticket.severidade] ?? 'Severidade não informada'}</span>
                <span className="rounded-md border border-border bg-bg px-2 py-1 text-[10px] text-text-secondary">{statusText[status] ?? ticket.status}</span>
                <TicketSlaBadge status={ticket.slaStatus} />
              </div>
              <p className="mt-2 truncate text-sm font-medium text-text-primary">{equip ? `${equip.codigo} · ${equip.nome}` : 'Equipamento —'}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-text-secondary">{ticket.descricao || 'Sem descrição'}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-text-muted">
                <span>{hospital?.nome ?? 'Hospital —'}{sector?.nome ? ` · ${sector.nome}` : ''}</span>
                <time dateTime={ticket.abertoEm}>{relativeTime(ticket.abertoEm)} · {new Date(ticket.abertoEm).toLocaleString('pt-BR')}</time>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <Link to={`/tickets/${ticket.id}`} className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-xs font-medium text-text-secondary hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Detalhes <ArrowUpRight aria-hidden="true" size={13} /></Link>
              {canGenerate && <button type="button" onClick={() => { setSelectedTicket(ticket); setCodigo(''); setTecnicoId('') }} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><ClipboardPlus aria-hidden="true" size={14} />Gerar OT corretiva</button>}
            </div>
          </article>
        })}
      </section>}
    </div>

    {selectedTicket && <Modal title="Gerar OT corretiva" description={`Chamado ${selectedTicket.id.slice(0, 8)}`} busy={createWorkOrder.isPending} onClose={() => setSelectedTicket(null)}>
        <form className="space-y-4" onSubmit={(event) => void submitCorrectiveWorkOrder(event)}>
          <label className="grid gap-1.5 text-xs font-medium text-text-secondary">Código da OT<input autoFocus required maxLength={40} value={codigo} onChange={(event) => setCodigo(event.target.value)} placeholder="Ex.: OT-2042" className={`${inputClass} w-full`} /></label>
          <label className="grid gap-1.5 text-xs font-medium text-text-secondary">Técnico responsável<Select required value={tecnicoId} onChange={setTecnicoId} placeholder="Selecione um técnico" options={eligibleTechnicians.map((technician) => ({ value: technician.id, label: technician.nome }))} /></label>
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
