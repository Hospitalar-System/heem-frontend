import { ArrowLeft, Building2, Package, Pencil, Power, PowerOff, Rows3, type LucideIcon } from 'lucide-react'
import { useMemo, useState, useSyncExternalStore, type KeyboardEvent } from 'react'
import { toast } from 'sonner'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { PageAction } from '@/components/ui/PageAction'
import { DataTable, type DataColumn } from '@/components/ui/DataTable'
import { Select } from '@/components/ui/Select'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { usePageClamp, usePaginationParams } from '@/hooks/usePaginationParams'
import { useSortParams } from '@/hooks/useSortParams'
import { useServerSearch } from '@/hooks/useServerSearch'
import { getAuthState, subscribeAuthState } from '@/features/auth/session'
import { useEquipmentsPage, useHospital, useSectors, useSectorsPage, useSetSectorActive } from '../api/assets'
import { EquipmentListTable } from '../components/EquipmentListTable'
import { HospitalForm, formatCnpj } from '../components/HospitalForm'
import { SectorForm } from '../components/SectorForm'
import type { RiscoSetor, Setor, SetorAtivoFiltro } from '../types'

type HospitalTab = 'dados' | 'setores' | 'equipamentos'
const tabs: Array<{ id: HospitalTab; label: string; Icon: LucideIcon }> = [
  { id: 'dados', label: 'Dados', Icon: Building2 },
  { id: 'setores', label: 'Setores', Icon: Rows3 },
  { id: 'equipamentos', label: 'Equipamentos', Icon: Package },
]
const riskLabels: Record<RiscoSetor, string> = { CRITICO: 'Crítico', SEMI_CRITICO: 'Semicrítico', NAO_CRITICO: 'Não crítico' }
const groupLabels = { GRUPO_0: 'Grupo 0', GRUPO_1: 'Grupo 1', GRUPO_2: 'Grupo 2' }
const inputClass = 'h-9 w-full rounded-md border border-border bg-bg px-3 text-xs text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'
const activeFilters: Array<{ value: SetorAtivoFiltro; label: string }> = [{ value: 'true', label: 'Ativos' }, { value: 'false', label: 'Inativos' }, { value: 'todos', label: 'Todos' }]
const parseActiveFilter = (value: string | null): SetorAtivoFiltro => (value === 'false' || value === 'todos' ? value : 'true')
/** Mensagem da falha ao desativar/reativar, a partir do ProblemDetail do backend. */
function sectorActiveError(error: unknown, activating: boolean) {
  const response = (error as { response?: { status?: number; data?: { code?: string; equipamentosAtivos?: number } } } | null)?.response
  const code = response?.data?.code
  if (code === 'SETOR_COM_EQUIPAMENTOS_ATIVOS') {
    const count = response?.data?.equipamentosAtivos
    return typeof count === 'number'
      ? `Este setor tem ${count} equipamento${count === 1 ? '' : 's'} ativo${count === 1 ? '' : 's'}. Transfira ou desative os equipamentos antes.`
      : 'Este setor tem equipamento(s) ativo(s). Transfira ou desative os equipamentos antes.'
  }
  if (code === 'HOSPITAL_DESATIVADO') return 'O hospital deste setor está desativado. Reative o hospital antes de reativar o setor.'
  if (response?.status === 403) return 'Você não tem permissão para alterar a situação de setores.'
  if (response?.status === 404) return 'Setor não encontrado. Atualize a página e tente novamente.'
  return activating ? 'Não foi possível reativar o setor.' : 'Não foi possível desativar o setor.'
}
const parseTab = (value: string | null): HospitalTab => (tabs.some((tab) => tab.id === value) ? (value as HospitalTab) : 'dados')

const equipmentSortFields = ['nome', 'codigo', 'categoria'] as const

export function HospitalDetailPage() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const activeTab = parseTab(params.get('aba'))
  const hospital = useHospital(id)
  const auth = useSyncExternalStore(subscribeAuthState, getAuthState, getAuthState)
  const isAdmin = auth.user?.roles.includes('admin_cliente') ?? false
  const pagination = usePaginationParams()
  const activeFilter = parseActiveFilter(params.get('ativo'))
  // Aba Setores: o servidor filtra (ativo), pagina e conta equipamentos. Demais abas usam a lista completa (seletor e nomes).
  const sectorsPage = useSectorsPage(id, { ...pagination.apiParams, ativo: activeFilter }, activeTab === 'setores')
  const allSectors = useSectors(id, { ativo: 'todos' }, activeTab !== 'setores')
  const setSectorActive = useSetSectorActive()
  const { sort, apiParams: sortParams, onSortChange } = useSortParams(equipmentSortFields)
  const [editingHospital, setEditingHospital] = useState(false)
  const [creatingSector, setCreatingSector] = useState(false)
  const [editingSector, setEditingSector] = useState<Setor | null>(null)
  const [sectorFilter, setSectorFilter] = useState('')
  const search = useServerSearch(pagination)
  // Aba Equipamentos: paginação, ordenação, filtro de setor e busca por texto no servidor.
  const equipment = useEquipmentsPage({ hospitalId: id, setorId: sectorFilter || undefined, q: search.term, ...pagination.apiParams, ...sortParams }, activeTab === 'equipamentos')
  const equipmentCount = useEquipmentsPage({ hospitalId: id, pagina: 0, tamanho: 1 }, activeTab !== 'equipamentos')
  const equipmentTotal = (activeTab === 'equipamentos' ? equipment.data : equipmentCount.data)?.total

  const setTab = (tab: HospitalTab) => setParams((current) => { const next = new URLSearchParams(current); next.set('aba', tab); next.delete('pagina'); next.delete('ordenar'); next.delete('direcao'); return next }, { replace: true })
  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const next = tabs[(index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length].id
    setTab(next)
    document.getElementById(`hospital-tab-${next}`)?.focus()
  }

  const sectorNameById = useMemo(() => new Map((allSectors.data ?? []).map((sector) => [sector.id, sector.nome])), [allSectors.data])
  const selectableSectors = useMemo(() => (allSectors.data ?? []).filter((sector) => sector.ativo !== false), [allSectors.data])
  const sectorTotal = sectorsPage.data?.total ?? 0
  usePageClamp(pagination, sectorsPage.data?.total, activeTab === 'setores' && !sectorsPage.isPlaceholderData)
  usePageClamp(pagination, equipment.data?.total, activeTab === 'equipamentos' && !equipment.isPlaceholderData)
  const changeActive = async (sector: Setor, ativo: boolean) => {
    try {
      await setSectorActive.mutateAsync({ id: sector.id, hospitalId: id, ativo })
      toast.success(ativo ? 'Setor reativado.' : 'Setor desativado.')
    } catch (error) { toast.error(sectorActiveError(error, ativo)) }
  }
  const sectorColumns: DataColumn<Setor>[] = [
    { key: 'codigo', header: 'Código', cell: (sector) => <span className="font-semibold">{sector.codigo}</span> },
    { key: 'nome', header: 'Nome', cell: (sector) => <span className="text-sm font-medium text-text-primary">{sector.nome}</span> },
    { key: 'andar', header: 'Andar', cell: (sector) => <span className="text-text-secondary">{sector.andar || '—'}</span> },
    { key: 'risco', header: 'Classificação de risco', cell: (sector) => <span className="text-text-secondary">{riskLabels[sector.classificacaoRisco]}</span> },
    { key: 'grupo', header: 'Grupo de instalação', cell: (sector) => <span className="text-text-secondary">{groupLabels[sector.grupoInstalacao]}</span> },
    { key: 'equipamentos', header: 'Equipamentos', cell: (sector) => <span className="tabular-nums text-text-secondary" data-testid={`sector-count-${sector.id}`}>{sector.equipamentosTotal === undefined ? '—' : `${sector.equipamentosAtivos ?? 0} ativos / ${sector.equipamentosTotal}`}</span> },
    { key: 'situacao', header: 'Situação', cell: (sector) => <StatusBadge tone={sector.ativo === false ? 'neutral' : 'success'}>{sector.ativo === false ? 'Inativo' : 'Ativo'}</StatusBadge> },
  ]

  const action = activeTab === 'setores' ? <PageAction onClick={() => setCreatingSector(true)} collapseLabelOnMobile>Novo setor</PageAction> : undefined

  return <AdminPageShell title={hospital.data?.nome ?? 'Hospital'} subtitle="Dados, setores e equipamentos do hospital" action={action}>
    <div className="mb-5"><Link to="/hospitals" className="inline-flex items-center gap-2 text-xs text-text-secondary hover:text-primary"><ArrowLeft size={14} /> Hospitais</Link></div>
    {hospital.isError ? <section role="alert" className="rounded-lg border border-border bg-surface p-6"><p>Não foi possível carregar este hospital.</p><button type="button" className="mt-3 text-sm text-primary underline" onClick={() => void hospital.refetch()}>Tentar novamente</button></section> : <>
      <div role="tablist" aria-label="Seções do hospital" className="flex max-w-full gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-1">
        {tabs.map(({ id: tabId, label, Icon }, index) => <button key={tabId} type="button" role="tab" id={`hospital-tab-${tabId}`} aria-selected={activeTab === tabId} aria-controls="hospital-tab-panel" tabIndex={activeTab === tabId ? 0 : -1} onClick={() => setTab(tabId)} onKeyDown={(event) => onTabKeyDown(event, index)} className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-md px-3 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary ${activeTab === tabId ? 'bg-primary text-bg-brand' : 'text-text-secondary hover:bg-bg hover:text-text-primary'}`}><Icon size={14} />{label}</button>)}
      </div>
      <section role="tabpanel" id="hospital-tab-panel" aria-labelledby={`hospital-tab-${activeTab}`} className="mt-4">
        {activeTab === 'dados' ? <div className="max-w-xl rounded-lg border border-border bg-surface p-5">
          {hospital.isLoading ? <div aria-label="Carregando hospital" aria-busy="true" className="h-24 animate-pulse rounded bg-bg" /> : <>
            <dl className="grid gap-4 sm:grid-cols-2"><div><dt className="text-[11px] uppercase text-text-muted">Nome</dt><dd className="mt-1 text-sm font-medium">{hospital.data?.nome}</dd></div><div><dt className="text-[11px] uppercase text-text-muted">CNPJ</dt><dd className="mt-1 text-sm">{formatCnpj(hospital.data?.cnpj ?? '') || '—'}</dd></div><div><dt className="text-[11px] uppercase text-text-muted">Setores</dt><dd className="mt-1 text-sm tabular-nums">{allSectors.data ? selectableSectors.length : '—'}</dd></div><div><dt className="text-[11px] uppercase text-text-muted">Equipamentos</dt><dd className="mt-1 text-sm tabular-nums">{equipmentTotal ?? '—'}</dd></div></dl>
            <div className="mt-5 flex justify-end border-t border-border pt-4"><button type="button" onClick={() => setEditingHospital(true)} className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-xs font-medium hover:bg-bg"><Pencil size={14} /> Editar hospital</button></div>
          </>}
        </div> : null}

        {activeTab === 'setores' ? <>
          <div className="mb-4 max-w-[12rem]"><Select size="sm" aria-label="Filtrar setores por situação" value={activeFilter} onChange={(next) => pagination.setFilters({ ativo: next === 'true' ? undefined : next })} options={activeFilters} /></div>
          <DataTable
            label="Setores"
            columns={sectorColumns}
            rows={sectorsPage.data?.items ?? []}
            getRowId={(sector) => sector.id}
            rowLabel={(sector) => sector.nome}
            rowActions={(sector) => [
              { label: 'Editar', icon: <Pencil size={14} />, onSelect: () => setEditingSector(sector) },
              ...(isAdmin ? [sector.ativo === false
                ? { label: 'Reativar', icon: <Power size={14} />, onSelect: () => changeActive(sector, true) }
                : { label: 'Desativar', icon: <PowerOff size={14} />, destructive: true, confirm: { title: `Desativar o setor ${sector.nome}?`, description: 'O setor deixa de aparecer nos seletores e filtros, mas o histórico é preservado. Só é possível desativar setores sem equipamentos ativos.', confirmLabel: 'Desativar' }, onSelect: () => changeActive(sector, false) }] : []),
            ]}
            isLoading={sectorsPage.isLoading}
            loadingLabel="Carregando setores"
            minWidth="860px"
            error={sectorsPage.isError ? { message: 'Não foi possível carregar os setores deste hospital.', onRetry: () => void sectorsPage.refetch() } : null}
            empty={activeFilter === 'true' ? { icon: <Rows3 />, title: 'Nenhum setor cadastrado', description: `Adicione o primeiro setor de ${hospital.data?.nome ?? 'este hospital'}.`, action: <PageAction onClick={() => setCreatingSector(true)} fullWidthMobile>Criar setor</PageAction> } : { icon: <Rows3 />, title: activeFilter === 'false' ? 'Nenhum setor inativo' : 'Nenhum setor cadastrado' }}
            pagination={{ page: pagination.page, size: pagination.size, total: sectorTotal, onPageChange: pagination.setPage, onSizeChange: pagination.setSize }}
          />
        </> : null}

        {activeTab === 'equipamentos' ? <>
          <div className="mb-4 grid gap-2 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
            <Select size="sm" aria-label="Filtrar por setor" value={sectorFilter} onChange={(next) => { setSectorFilter(next); pagination.resetPage() }} options={[{ value: '', label: 'Todos os setores' }, ...selectableSectors.map((sector) => ({ value: sector.id, label: sector.nome }))]} />
            <input aria-label="Buscar equipamento" type="search" value={search.input} onChange={(event) => search.setInput(event.target.value)} placeholder="Código, nome, modelo, série…" title="Busca por código, nome, modelo, série ou categoria" className={inputClass} />
          </div>
          <EquipmentListTable
            items={equipment.data?.items ?? []}
            sort={sort}
            onSortChange={onSortChange}
            pagination={{ page: pagination.page, size: pagination.size, total: equipment.data?.total ?? 0, onPageChange: pagination.setPage, onSizeChange: pagination.setSize }}
            sectorNameById={sectorNameById}
            isLoading={equipment.isLoading}
            error={equipment.isError ? { message: 'Não foi possível carregar os equipamentos.', onRetry: () => void equipment.refetch() } : null}
            empty={{ title: (equipment.data?.items.length ?? 0) === 0 ? 'Nenhum equipamento neste hospital' : 'Nenhum equipamento encontrado' }}
          />
        </> : null}
      </section>
    </>}
    {editingHospital && hospital.data && <HospitalForm hospital={hospital.data} onClose={() => setEditingHospital(false)} onSaved={() => setEditingHospital(false)} />}
    {creatingSector && <SectorForm hospitalId={id} onClose={() => setCreatingSector(false)} onSaved={() => setCreatingSector(false)} />}
    {editingSector && <SectorForm sector={editingSector} hospitalId={id} onClose={() => setEditingSector(null)} onSaved={() => setEditingSector(null)} />}
  </AdminPageShell>
}
