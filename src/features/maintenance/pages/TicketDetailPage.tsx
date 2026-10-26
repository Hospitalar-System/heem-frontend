import { AlertTriangle, ArrowLeft, CalendarClock, ClipboardPlus, MapPin, UserRound } from 'lucide-react'
import { useMemo, useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { Modal } from '@/components/ui/Modal'
import { useEquipment, useHospitals, useSectorsForHospitals } from '@/features/assets/api/assets'
import { getAuthState, subscribeAuthState } from '@/features/auth/session'
import { useUserHospitalLinks } from '@/features/tenants-users/api/users'
import type { TenantUser } from '@/features/tenants-users/types'
import { apiClient } from '@/lib/axios'
import { useCreateCorrectiveWorkOrder, useTicket, useTicketHistory } from '../api/tickets'
import { TicketSlaBadge } from '../components/TicketSlaBadge'
import { formatSlaDeadline } from '../utils/sla'
import type { TicketStatus } from '../types'
import { Select } from '@/components/ui/Select'

const fieldClass = 'h-10 w-full rounded-md border border-border bg-bg px-3 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'
const severityLabel: Record<string, string> = { CRITICA: 'Crítica', ALTA: 'Alta', MEDIA: 'Média', BAIXA: 'Baixa' }
const statusLabel: Record<string, string> = { ABERTO: 'Aberto', EM_ANDAMENTO: 'Em andamento', AGUARDANDO_PECA: 'Aguardando peça', RESOLVIDO: 'Resolvido', CANCELADO: 'Cancelado' }
const actionLabel: Record<string, string> = { ABRIR_CHAMADO: 'Chamado aberto', TRANSICIONAR_CHAMADO: 'Status atualizado', GERAR_OT_CORRETIVA: 'OT corretiva gerada' }

function normalizeStatus(status: TicketStatus) {
  return status.toLocaleUpperCase('pt-BR').replace('Ç', 'C')
}

function severityStyle(value: string) {
  if (value === 'CRITICA') return 'border-danger/30 bg-danger/10 text-danger'
  if (value === 'ALTA') return 'border-warning/30 bg-warning/10 text-warning'
  if (value === 'BAIXA') return 'border-primary/30 bg-primary/10 text-primary'
  return 'border-border bg-bg text-text-secondary'
}

function statusStyle(status: string) {
  if (status === 'RESOLVIDO') return 'border-primary/30 bg-primary/10 text-primary'
  if (status === 'ABERTO' || status === 'AGUARDANDO_PECA') return 'border-warning/30 bg-warning/10 text-warning'
  if (status === 'EM_ANDAMENTO') return 'border-border bg-bg text-text-secondary'
  return 'border-border bg-bg text-text-secondary'
}

export function TicketDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const auth = useSyncExternalStore(subscribeAuthState, getAuthState, getAuthState)
  const isAdmin = auth.user?.roles.includes('admin_cliente') ?? false
  const isTechnician = auth.user?.roles.includes('tecnico') ?? false
  const ticket = useTicket(id)
  const history = useTicketHistory(id, !ticket.isLoading && !ticket.isError)
  const hospitals = useHospitals()
  const hospitalIds = useMemo(() => hospitals.data?.map(({ id: hospitalId }) => hospitalId) ?? [], [hospitals.data])
  const sectors = useSectorsForHospitals(hospitalIds)
  const equipment = useEquipment(ticket.data?.equipamentoId ?? '')
  const actor = useQuery({
    queryKey: ['tenant-users', ticket.data?.abertoPor],
    queryFn: async () => (await apiClient.get<{ id: string; nome: string; email: string }>(`/users/${ticket.data?.abertoPor}`)).data,
    enabled: Boolean(ticket.data?.abertoPor && isAdmin),
  })
  const users = useQuery({
    queryKey: ['tenant-users'],
    queryFn: async () => (await apiClient.get<TenantUser[]>('/users')).data,
    enabled: isAdmin,
  })
  const hospitalLinks = useUserHospitalLinks(isAdmin ? users.data ?? [] : [])
  const createWorkOrder = useCreateCorrectiveWorkOrder()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [tecnicoId, setTecnicoId] = useState('')

  const hospital = hospitals.data?.find((item) => item.id === ticket.data?.hospitalId)
  const sector = sectors.data?.find((item) => item.id === ticket.data?.setorId)
  const activeTechnicians = useMemo(() => {
    const linked = (users.data ?? []).flatMap((user, index) =>
      user.role === 'tecnico' && user.ativo
        ? (hospitalLinks[index]?.data ?? []).filter((hospitalId) => hospitalId === ticket.data?.hospitalId).map(() => user)
        : [],
    )
    if (isAdmin) return linked
    if (isTechnician && auth.user) return [{ id: auth.user.id, nome: auth.user.name, role: 'tecnico', ativo: true }]
    return []
  }, [auth.user, hospitalLinks, isAdmin, isTechnician, ticket.data?.hospitalId, users.data])
  const normalizedStatus = ticket.data ? normalizeStatus(ticket.data.status) : ''
  const canGenerateCorrective = normalizedStatus === 'ABERTO' || normalizedStatus === 'AGUARDANDO_PECA'

  async function submitCorrectiveWorkOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!ticket.data || !codigo.trim() || !tecnicoId) return
    try {
      const created = await createWorkOrder.mutateAsync({ codigo: codigo.trim(), chamadoId: ticket.data.id, tecnicoId })
      toast.success(`OT corretiva ${created.codigo} criada.`, created.id ? {
        action: { label: 'Abrir OT', onClick: () => navigate(`/work-orders/${created.id}`) },
      } : undefined)
      setIsCreateOpen(false)
      setCodigo('')
      setTecnicoId('')
    } catch {
      // Keep the form open to allow correction or retry.
    }
  }

  if (ticket.isLoading) return <AdminPageShell title="Chamados de Emergência" subtitle="Detalhe do chamado"><DetailSkeleton /></AdminPageShell>
  if (ticket.isError || !ticket.data) return <AdminPageShell title="Chamados de Emergência" subtitle="Detalhe do chamado"><section role="alert" className="grid min-h-64 place-items-center rounded-lg border border-border bg-surface p-8 text-center"><div><h2 className="text-base font-semibold text-text-primary">Não foi possível carregar este chamado</h2><p className="mt-2 max-w-md text-sm text-text-secondary">{getErrorMessage(ticket.error)}</p><div className="mt-4 flex justify-center gap-2"><button type="button" onClick={() => void ticket.refetch()} className="h-9 rounded-md border border-border px-3 text-xs font-medium hover:bg-bg">Tentar novamente</button><button type="button" onClick={() => navigate('/tickets')} className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand">Voltar à lista</button></div></div></section></AdminPageShell>

  return <AdminPageShell title="Chamados de Emergência" subtitle="Detalhe e histórico do chamado">
    <div className="space-y-4">
      <Link to="/tickets" className="inline-flex items-center gap-2 rounded text-xs font-medium text-text-secondary outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-primary"><ArrowLeft aria-hidden="true" size={15} />Voltar aos chamados</Link>

      <section className="rounded-lg border border-border bg-surface p-5 xl:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><p className="text-xs font-medium text-text-muted">Chamado {ticket.data.id}</p><span className={`rounded-md border px-2 py-1 text-[10px] font-semibold ${severityStyle(ticket.data.severidade)}`}>{severityLabel[ticket.data.severidade] ?? 'Severidade não informada'}</span><span className={`rounded-md border px-2 py-1 text-[10px] font-medium ${statusStyle(normalizedStatus)}`}>{statusLabel[normalizedStatus] ?? ticket.data.status}</span></div>
            <h2 className="mt-3 text-xl font-semibold text-text-primary">{equipment.data?.nome ?? 'Chamado de emergência'}</h2>
            <p className="mt-1 text-sm text-text-secondary">{equipment.data?.codigo ?? ticket.data.equipamentoId}</p>
          </div>
          {canGenerateCorrective && (isAdmin || isTechnician) && <button type="button" onClick={() => setIsCreateOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><ClipboardPlus aria-hidden="true" size={15} />Gerar OT corretiva</button>}
        </div>
        <div className="mt-5 grid gap-4 border-t border-border pt-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metadata icon={<MapPin size={15} />} label="Hospital / setor" value={`${hospital?.nome ?? '—'}${sector?.nome ? ` · ${sector.nome}` : ''}`} />
          <Metadata icon={<CalendarClock size={15} />} label="Aberto em" value={formatDate(ticket.data.abertoEm)} />
          <Metadata icon={<UserRound size={15} />} label="Aberto por" value={actor.data?.nome ?? (isAdmin && actor.isLoading ? 'Carregando…' : ticket.data.abertoPor)} />
          <Metadata icon={<AlertTriangle size={15} />} label="Equipamento" value={equipment.data ? `${equipment.data.codigo} · ${equipment.data.nome}` : ticket.data.equipamentoId} />
        </div>
      </section>

      {ticket.data.slaStatus && <section aria-label="Prazos de SLA" className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-border bg-surface px-5 py-4">
        <div>
          <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-text-primary">Acordo de nível de serviço</h3><TicketSlaBadge status={ticket.data.slaStatus} /></div>
          <p className="mt-1 text-[11px] text-text-muted">Situação calculada pelo backend; os prazos são congelados na abertura do chamado.</p>
        </div>
        <dl className="grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
          <div><dt className="text-text-muted">Atendimento até</dt><dd className="mt-0.5 font-medium text-text-primary">{formatSlaDeadline(ticket.data.slaAtendimentoAte) ?? '—'}</dd></div>
          <div><dt className="text-text-muted">Resolução até</dt><dd className="mt-0.5 font-medium text-text-primary">{formatSlaDeadline(ticket.data.slaResolucaoAte) ?? '—'}</dd></div>
        </dl>
      </section>}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
        <div className="space-y-4">
          <section aria-labelledby="description-title" className="rounded-lg border border-border bg-surface p-5">
            <h3 id="description-title" className="text-sm font-semibold text-text-primary">Descrição do problema</h3>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text-secondary">{ticket.data.descricao || 'Nenhuma descrição foi informada.'}</p>
          </section>
          <section aria-labelledby="attachments-title" className="rounded-lg border border-border bg-surface p-5">
            <h3 id="attachments-title" className="text-sm font-semibold text-text-primary">Anexos</h3>
            <p className="mt-3 text-xs text-text-muted">O contrato atual do chamado não retorna anexos.</p>
          </section>
        </div>

        <section aria-labelledby="history-title" className="rounded-lg border border-border bg-surface p-5">
          <div className="flex items-center justify-between gap-3"><div><h3 id="history-title" className="text-sm font-semibold text-text-primary">Histórico</h3><p className="mt-1 text-xs text-text-muted">Eventos registrados pela API</p></div>{history.isError && <button type="button" onClick={() => void history.refetch()} className="text-xs font-medium text-primary hover:underline">Tentar novamente</button>}</div>
          {history.isLoading ? <div aria-label="Carregando histórico" aria-busy="true" className="mt-5 space-y-4"><span className="sr-only">Carregando histórico.</span>{[0, 1, 2].map((item) => <div key={item} className="h-12 animate-pulse rounded bg-bg" />)}</div> : history.isError ? <p role="alert" className="mt-5 text-xs text-danger">Não foi possível carregar o histórico.</p> : history.data?.length ? <ol className="mt-5 space-y-0">{[...history.data].sort((a, b) => Date.parse(a.ocorridoEm) - Date.parse(b.ocorridoEm)).map((item, index) => <li key={`${item.ocorridoEm}-${item.acao}-${index}`} className="relative flex gap-3 pb-5 last:pb-0"><span aria-hidden="true" className="relative mt-1 flex size-3 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-surface after:absolute after:top-[10px] after:h-[calc(100%+12px)] after:w-px after:bg-border last:after:hidden" /><div className="min-w-0"><p className="text-xs font-medium text-text-primary">{actionLabel[item.acao] ?? item.acao.replaceAll('_', ' ').toLocaleLowerCase('pt-BR')}</p><p className="mt-1 text-[11px] text-text-muted">{item.atorId ? `Usuário ${item.atorId}` : 'Sistema'} · {formatDate(item.ocorridoEm)}</p></div></li>)}</ol> : <p className="mt-5 rounded-md border border-dashed border-border px-4 py-6 text-center text-xs text-text-muted">Nenhum evento de histórico foi retornado.</p>}
        </section>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3">
        <p className="text-xs text-text-secondary">Atribuição de técnico ainda não está disponível: o endpoint de status não aceita um técnico responsável.</p>
        <button type="button" disabled aria-label="Atribuir técnico indisponível" title="A API ainda não disponibiliza atribuição de técnico para chamados" className="h-9 cursor-not-allowed rounded-md border border-border px-3 text-xs font-medium text-text-muted opacity-70">Atribuir técnico</button>
      </section>
    </div>

    {isCreateOpen && <Modal title="Gerar OT corretiva" description={`Chamado ${ticket.data.id}`} busy={createWorkOrder.isPending} onClose={() => setIsCreateOpen(false)}>
      <form className="space-y-4" onSubmit={(event) => void submitCorrectiveWorkOrder(event)}>
        <label className="grid gap-1.5 text-xs font-medium text-text-secondary">Código da OT<input autoFocus required maxLength={40} value={codigo} onChange={(event) => setCodigo(event.target.value)} placeholder="Ex.: OT-2042" className={fieldClass} /></label>
        <label className="grid gap-1.5 text-xs font-medium text-text-secondary">Técnico responsável<Select required value={tecnicoId} onChange={setTecnicoId} placeholder="Selecione um técnico" options={activeTechnicians.map((user) => ({ value: user.id, label: user.nome }))} /></label>
        {isAdmin && !users.isLoading && !hospitalLinks.some((query) => query.isLoading) && activeTechnicians.length === 0 && <p role="status" className="text-xs text-warning">Não há técnicos ativos vinculados ao hospital deste chamado.</p>}
        {isTechnician && <p className="text-xs text-text-muted">A OT será atribuída a você; o backend validará seu vínculo com o hospital.</p>}
        {createWorkOrder.isError && <p role="alert" className="text-xs text-danger">{getErrorMessage(createWorkOrder.error)}</p>}
        <div className="flex justify-end gap-2 border-t border-border pt-4"><button type="button" disabled={createWorkOrder.isPending} onClick={() => setIsCreateOpen(false)} className="h-9 rounded-md border border-border px-3 text-xs font-medium text-text-secondary hover:bg-bg">Cancelar</button><button type="submit" disabled={!codigo.trim() || !tecnicoId || createWorkOrder.isPending} className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50">{createWorkOrder.isPending ? 'Criando…' : 'Criar OT'}</button></div>
      </form>
    </Modal>}
  </AdminPageShell>
}

function Metadata({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="min-w-0"><p className="flex items-center gap-1.5 text-[11px] text-text-muted">{icon}{label}</p><p className="mt-1 truncate text-xs font-medium text-text-primary" title={value}>{value}</p></div>
}

function DetailSkeleton() {
  return <div aria-label="Carregando chamado" aria-busy="true" className="space-y-4"><div className="h-48 animate-pulse rounded-lg border border-border bg-surface" /><div className="grid gap-4 xl:grid-cols-2"><div className="h-64 animate-pulse rounded-lg border border-border bg-surface" /><div className="h-64 animate-pulse rounded-lg border border-border bg-surface" /></div></div>
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('pt-BR')
}

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: string; code?: string } } }).response
    return response?.data?.detail ?? response?.data?.code ?? 'O chamado não existe ou você não tem acesso a ele.'
  }
  return 'O chamado não existe ou você não tem acesso a ele.'
}
