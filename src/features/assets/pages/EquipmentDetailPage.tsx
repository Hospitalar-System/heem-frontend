import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import { ArrowLeft, CalendarClock, ClipboardList, Edit3, FileText, Gauge, History, ListChecks, Tag } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { getAuthState } from '@/features/auth/session'
import { EquipmentStatusBadge } from '../components/EquipmentStatusBadge'
import { EquipmentDocumentsSection } from '../components/EquipmentDocumentsSection'
import { EquipmentPhotoSection } from '../components/EquipmentPhotoSection'
import { EquipmentLabelsSection } from '../components/EquipmentLabelsSection'
import { useEquipment, useEquipmentWorkOrders, useHospital, useSector } from '../api/assets'
import type { Equipment } from '../types'
import { Badge } from '@/components/ui/Badge'

type EquipmentTab = 'dados' | 'medicoes' | 'checklists' | 'ots' | 'documentos' | 'etiquetas'
const tabs: Array<{ id: EquipmentTab; label: string; Icon: typeof Gauge }> = [
  { id: 'dados', label: 'Dados', Icon: Gauge },
  { id: 'medicoes', label: 'Histórico de medições', Icon: History },
  { id: 'checklists', label: 'Checklists', Icon: ListChecks },
  { id: 'ots', label: 'OTs', Icon: ClipboardList },
]

export function EquipmentDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<EquipmentTab>('dados')
  const equipment = useEquipment(id)
  const sector = useSector(equipment.data?.setorId ?? '')
  const hospital = useHospital(sector.data?.hospitalId ?? '')
  const orders = useEquipmentWorkOrders(id)
  const roles = getAuthState().user?.roles ?? []
  const isAdmin = roles.includes('admin_cliente')
  // Backend: documentos só para admin_cliente e tecnico; alterar validade/excluir só admin_cliente.
  const canReadDocuments = isAdmin || roles.includes('tecnico')
  const visibleTabs = [...tabs, ...(canReadDocuments ? [{ id: 'documentos' as const, label: 'Documentos', Icon: FileText }] : []), ...(isAdmin ? [{ id: 'etiquetas' as const, label: 'Etiquetas', Icon: Tag }] : [])]
  const nextPreventive = useMemo(() => (orders.data ?? [])
    .filter((order) => order.tipo === 'PREVENTIVA' && order.status === 'AGENDADA' && order.dataAgendada)
    .sort((left, right) => Date.parse(left.dataAgendada ?? '') - Date.parse(right.dataAgendada ?? ''))[0], [orders.data])

  if (equipment.isLoading) return <AdminPageShell title="Equipamento" subtitle="Ativos"><div aria-label="Carregando equipamento" aria-busy="true" className="h-96 animate-pulse rounded-lg border border-border bg-surface" /></AdminPageShell>
  if (equipment.isError || !equipment.data) return <AdminPageShell title="Equipamento" subtitle="Ativos"><section role="alert" className="rounded-lg border border-danger/40 bg-surface p-5 text-sm"><p>Não foi possível carregar este equipamento. Verifique se ele está disponível para seu perfil.</p><button type="button" onClick={() => void equipment.refetch()} className="mt-3 text-primary underline">Tentar novamente</button><Link to="/assets" className="ml-4 inline-flex items-center gap-2 text-text-secondary underline"><ArrowLeft size={14} />Lista de equipamentos</Link></section></AdminPageShell>

  return <AdminPageShell title={equipment.data.nome} subtitle="Detalhe do equipamento">
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link to="/assets" className="inline-flex items-center gap-2 text-xs font-medium text-text-secondary hover:text-text-primary"><ArrowLeft size={14} />Equipamentos</Link>
        {isAdmin ? <button type="button" onClick={() => navigate(`/assets/${id}/edit`)} className="inline-flex h-8 items-center gap-2 rounded-md border border-border px-3 text-xs font-medium hover:bg-surface"><Edit3 size={14} />Editar</button> : null}
      </div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs text-text-muted">{equipment.data.codigo} · {hospital.data?.nome ?? 'Hospital'}{sector.data?.nome ? ` › ${sector.data.nome}` : ''}</p><h2 className="mt-1 text-xl font-semibold">{equipment.data.nome}</h2></div>
        <EquipmentStatusBadge status={equipment.data.statusCicloVida} />
      </div>

      <div role="tablist" aria-label="Seções do equipamento" className="mt-5 flex max-w-full gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-1">
        {visibleTabs.map(({ id: tabId, label, Icon }, index) => <button key={tabId} type="button" role="tab" id={`equipment-tab-${tabId}`} aria-selected={activeTab === tabId} aria-controls="equipment-tab-panel" tabIndex={activeTab === tabId ? 0 : -1} onClick={() => setActiveTab(tabId)} onKeyDown={(event) => handleTabKeyDown(event, index, setActiveTab, visibleTabs)} className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-md px-3 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary ${activeTab === tabId ? 'bg-primary text-bg-brand' : 'text-text-secondary hover:bg-bg hover:text-text-primary'}`}><Icon size={14} />{label}</button>)}
      </div>

      <section id="equipment-tab-panel" role="tabpanel" aria-labelledby={`equipment-tab-${activeTab}`} className="mt-4 outline-none">
        {activeTab === 'dados' ? <EquipmentData equipment={equipment.data} canWritePhoto={canReadDocuments} order={nextPreventive} ordersLoading={orders.isLoading} isAdmin={isAdmin} /> : null}
        {activeTab === 'medicoes' ? <UnavailablePanel title="Histórico de medições indisponível" detail="A API ainda não fornece uma rota de consulta de medições por equipamento." /> : null}
        {activeTab === 'checklists' ? <UnavailablePanel title="Checklists vinculados indisponíveis" detail="A API ainda não fornece uma consulta dos checklists associados a este equipamento." /> : null}
        {activeTab === 'ots' ? <WorkOrdersPanel orders={orders.data ?? []} loading={orders.isLoading} error={orders.isError} retry={() => void orders.refetch()} /> : null}
        {activeTab === 'documentos' && canReadDocuments ? <EquipmentDocumentsSection equipmentId={id} canWrite={canReadDocuments} canManage={isAdmin} /> : null}
        {activeTab === 'etiquetas' && isAdmin ? <EquipmentLabelsSection equipmentId={id} /> : null}
      </section>
    </div>
  </AdminPageShell>
}

function EquipmentData({ equipment, canWritePhoto, order, ordersLoading, isAdmin }: { equipment: Equipment; canWritePhoto: boolean; order?: { codigo: string; dataAgendada: string | null; checklistId: string | null }; ordersLoading: boolean; isAdmin: boolean }) {
  return <div className="grid gap-4 xl:grid-cols-[1.05fr_1fr]">
    <section className="rounded-lg border border-border bg-surface p-5">
      <h3 className="text-sm font-semibold">Identificação</h3>
      <dl className="mt-3 divide-y divide-border/70">{([
        ['Código', equipment.codigo], ['Categoria', equipment.categoriaNome ?? <MissingCategory equipmentId={equipment.id} isAdmin={isAdmin} />], ['Modelo', equipment.modelo], ['Nº série', equipment.numeroSerie], ['Fabricante', equipment.marca],
        ['Classe de risco ANVISA', equipment.classeRiscoAnvisa], ['Criticidade', equipment.criticidade], ['Instalação', formatDate(equipment.dataInstalacao)], ['Garantia até', formatDate(equipment.dataGarantiaFim)],
      ] as Array<[string, ReactNode]>).map(([label, value]) => <div key={label} className="flex min-h-10 items-center justify-between gap-4 py-2"><dt className="text-xs text-text-muted">{label}</dt><dd className="break-all text-right text-xs font-medium text-text-primary">{value || '—'}</dd></div>)}</dl>
      {Object.keys(equipment.dadosGerais ?? {}).length ? <div className="mt-5 border-t border-border pt-4"><h4 className="text-xs font-semibold">Dados gerais</h4><dl className="mt-2 divide-y divide-border/70">{Object.entries(equipment.dadosGerais ?? {}).map(([key, value]) => <div key={key} className="flex min-h-9 items-center justify-between gap-4 py-2"><dt className="text-xs text-text-muted">{key}</dt><dd className="break-all text-right text-xs text-text-primary">{displayValue(value)}</dd></div>)}</dl></div> : null}
    </section>
    <div className="space-y-4">
      <EquipmentPhotoSection equipmentId={equipment.id} nome={equipment.nome} fotoVersao={equipment.fotoVersao} hasLegacyPhoto={Boolean(equipment.fotoUrl)} canWrite={canWritePhoto} canDelete={isAdmin} />
      <section className="rounded-lg border border-border bg-surface p-5">
        <div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-md bg-bg text-text-secondary"><Gauge size={16} /></span><h3 className="text-sm font-semibold">Indicadores</h3></div>
        <div className="mt-4 grid grid-cols-3 gap-2">{['MTBF', 'Disponibilidade', 'OTs no ano'].map((label) => <div key={label} className="min-w-0 rounded-md border border-border bg-surface p-3"><p className="truncate text-[10px] text-text-muted">{label}</p><p className="mt-1 text-sm font-semibold text-text-secondary">—</p></div>)}</div>
        <p className="mt-3 text-[11px] text-text-muted">A API de indicadores não oferece agregação por equipamento.</p>
      </section>
      <section className="rounded-lg border border-border bg-surface p-5">
        <div className="flex items-center gap-2"><CalendarClock size={16} className="text-text-secondary" /><h3 className="text-sm font-semibold">Próxima manutenção preventiva</h3></div>
        {ordersLoading ? <div aria-busy="true" className="mt-4 h-14 animate-pulse rounded-md bg-bg" /> : order ? <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-medium">{order.codigo}</p><p className="mt-1 text-xs text-text-secondary">Agendada para {formatDate(order.dataAgendada)}{order.checklistId ? ' · Checklist vinculado' : ''}</p></div><Badge variant="warning">Agendada</Badge></div> : <p className="mt-3 text-xs text-text-secondary">Nenhuma OT preventiva agendada.</p>}
        {isAdmin ? <Link to={`/work-orders/new?equipamentoId=${encodeURIComponent(equipment.id)}`} className="mt-4 inline-flex h-9 items-center rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Agendar OT preventiva</Link> : <p className="mt-2 text-[11px] text-text-muted">Apenas Admin do Cliente pode agendar uma OT.</p>}
      </section>
    </div>
  </div>
}

function MissingCategory({ equipmentId, isAdmin }: { equipmentId: string; isAdmin: boolean }) {
  return <span className="inline-flex flex-wrap items-center justify-end gap-2"><span className="text-text-muted">Sem categoria</span>{isAdmin ? <Link to={`/assets/${equipmentId}/edit`} className="font-semibold text-primary underline">Definir categoria</Link> : null}</span>
}

function WorkOrdersPanel({ orders, loading, error, retry }: { orders: Array<{ id: string; codigo: string; tipo: string; status: string; dataAgendada: string | null; concluidaEm: string | null }>; loading: boolean; error: boolean; retry: () => void }) {
  if (loading) return <div aria-label="Carregando ordens de trabalho" aria-busy="true" className="h-56 animate-pulse rounded-lg border border-border bg-surface" />
  if (error) return <section role="alert" className="rounded-lg border border-danger/40 bg-surface p-5 text-sm"><p>Não foi possível carregar as ordens deste equipamento.</p><button type="button" onClick={retry} className="mt-2 text-xs text-primary underline">Tentar novamente</button></section>
  if (!orders.length) return <EmptyPanel title="Nenhuma OT vinculada" detail="Não há ordens de trabalho para este equipamento." />
  return <div className="overflow-x-auto rounded-lg border border-border bg-surface"><table className="w-full min-w-[620px] border-collapse text-left"><thead><tr className="table-head h-11 text-[11px]"><th scope="col" className="px-4">Código</th><th scope="col" className="px-4">Tipo</th><th scope="col" className="px-4">Status</th><th scope="col" className="px-4">Data agendada</th><th scope="col" className="px-4">Concluída em</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id} className="h-11 border-b border-border/70 text-xs last:border-0"><td className="px-4 font-medium">{order.codigo}</td><td className="px-4 text-text-secondary">{order.tipo === 'PREVENTIVA' ? 'Preventiva' : 'Corretiva'}</td><td className="px-4 text-text-secondary">{order.status.replaceAll('_', ' ')}</td><td className="px-4 text-text-secondary">{formatDate(order.dataAgendada)}</td><td className="px-4 text-text-secondary">{formatDate(order.concluidaEm)}</td></tr>)}</tbody></table></div>
}

function EmptyPanel({ title, detail }: { title: string; detail: string }) {
  return <section className="grid min-h-48 place-items-center rounded-lg border border-dashed border-border bg-surface p-6 text-center"><div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs text-text-secondary">{detail}</p></div></section>
}

function UnavailablePanel({ title, detail }: { title: string; detail: string }) {
  return <section className="rounded-lg border border-border bg-surface p-5"><h3 className="text-sm font-semibold">{title}</h3><p className="mt-2 text-xs text-text-secondary">{detail}</p></section>
}

function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, current: number, setActive: (tab: EquipmentTab) => void, availableTabs: typeof tabs) {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
  event.preventDefault()
  const offset = event.key === 'ArrowRight' ? 1 : -1
  const next = (current + offset + availableTabs.length) % availableTabs.length
  setActive(availableTabs[next].id)
  document.getElementById(`equipment-tab-${availableTabs[next].id}`)?.focus()
}

function formatDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date)
}

function displayValue(value: unknown) {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return '—'
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}
