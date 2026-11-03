import { useMemo, useState, useSyncExternalStore } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { getAuthState, subscribeAuthState } from '@/features/auth/session'
import { EquipmentListTable } from '../components/EquipmentListTable'
import { useEquipmentsPage, useHospitals, useSectorsForHospitals } from '../api/assets'
import { useCategories } from '../api/categories'
import { Select } from '@/components/ui/Select'
import { PageAction } from '@/components/ui/PageAction'
import { FilterBar } from '@/components/ui/FilterBar'
import { addDays, isoOf, todayCivil } from '@/components/ui/civil-date'
import { usePageClamp, usePaginationParams } from '@/hooks/usePaginationParams'
import { useSortParams } from '@/hooks/useSortParams'
import { useServerSearch } from '@/hooks/useServerSearch'

const inputClass = 'h-9 w-full rounded-md border border-border bg-bg px-3 text-xs text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'
/** Valores de `status` aceitos por GET /equipamentos (minúsculas). */
const lifecycleOptions = [
  { value: '', label: 'Todos os status' },
  { value: 'ativo', label: 'Ativo' },
  { value: 'em_manutencao', label: 'Em manutenção' },
  { value: 'inativo', label: 'Inativo' },
  { value: 'descartado', label: 'Descartado' },
]
const parseStatus = (value: string | null) => (lifecycleOptions.some((option) => option.value && option.value === value) ? (value as string) : '')

const NO_CATEGORY = '__sem_categoria__'
/** Janela de "vencendo" do painel (documentosVencendo30d). */
const EXPIRING_WINDOW_DAYS = 30
type DocumentsFilter = '' | 'vencendo' | 'vencido'
const documentsOptions: Array<{ value: DocumentsFilter; label: string }> = [
  { value: '', label: 'Documentos: todos' },
  { value: 'vencendo', label: 'Vencendo em 30 dias' },
  { value: 'vencido', label: 'Documento vencido' },
]
const sortFields = ['nome', 'codigo', 'categoria'] as const
const parseDocumentsFilter = (value: string | null): DocumentsFilter => (value === 'vencendo' || value === 'vencido' ? value : '')

export function AssetsPage() {
  const auth = useSyncExternalStore(subscribeAuthState, getAuthState, getAuthState)
  const isAdmin = auth.user?.roles.includes('admin_cliente') ?? false
  const hospitals = useHospitals()
  const pagination = usePaginationParams()
  const { sort, apiParams: sortParams, onSortChange } = useSortParams(sortFields)
  const [hospitalId, setHospitalId] = useState('')
  const [sectorId, setSectorId] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const categories = useCategories()
  const [searchParams, setSearchParams] = useSearchParams()
  const status = parseStatus(searchParams.get('status'))
  const search = useServerSearch(pagination)
  const [documentsFilter, setDocumentsFilter] = useState<DocumentsFilter>(() => parseDocumentsFilter(searchParams.get('documentos')))
  const changeDocumentsFilter = (next: DocumentsFilter) => {
    setDocumentsFilter(next)
    setSearchParams((current) => { const params = new URLSearchParams(current); if (next) params.set('documentos', next); else params.delete('documentos'); params.delete('pagina'); return params }, { replace: true })
  }
  const expiringUntil = documentsFilter === 'vencendo' ? isoOf(addDays(todayCivil(), EXPIRING_WINDOW_DAYS)) : undefined
  const equipment = useEquipmentsPage({
    ...pagination.apiParams,
    ...sortParams,
    hospitalId: hospitalId || undefined,
    setorId: sectorId || undefined,
    categoriaId: categoryFilter && categoryFilter !== NO_CATEGORY ? categoryFilter : undefined,
    semCategoria: categoryFilter === NO_CATEGORY ? true : undefined,
    q: search.term,
    status: status || undefined,
    vencendoEm: expiringUntil,
    documentoVencido: documentsFilter === 'vencido' ? true : undefined,
  })
  const sectors = useSectorsForHospitals(hospitals.data?.map(({ id }) => id) ?? [])
  const sectorNameById = useMemo(() => new Map((sectors.data ?? []).map((sector) => [sector.id, sector.nome])), [sectors.data])
  const total = equipment.data?.total ?? 0
  usePageClamp(pagination, equipment.data?.total, !equipment.isPlaceholderData)
  // Com filtro ativo, lista vazia significa "nada encontrado" (o filtro agora é do servidor), não "nada cadastrado".
  const hasEquipment = (equipment.data?.items.length ?? 0) > 0 || Boolean(status || search.term || hospitalId || sectorId || categoryFilter || documentsFilter)
  const clearFilters = () => { setHospitalId(''); setSectorId(''); setCategoryFilter(''); search.clear(); setSearchParams((current) => { const params = new URLSearchParams(current); params.delete('documentos'); params.delete('status'); params.delete('q'); params.delete('pagina'); return params }, { replace: true }); setDocumentsFilter('') }

  return <AdminPageShell title="Equipamentos" subtitle="Ativos dos hospitais do tenant" action={isAdmin ? <PageAction to="/assets/new" collapseLabelOnMobile>Novo equipamento</PageAction> : undefined}>
    <FilterBar label="Filtros de equipamentos" className="mb-4">
        <label className="min-w-0">
          <span className="sr-only">Filtrar por hospital</span>
          <Select size="sm" aria-label="Filtrar por hospital" value={hospitalId} onChange={(next) => { setHospitalId(next); setSectorId(''); pagination.resetPage() }} options={[{ value: '', label: 'Todos os hospitais' }, ...(hospitals.data ?? []).map((hospital) => ({ value: hospital.id, label: hospital.nome }))]} />
        </label>
        <label className="min-w-0">
          <span className="sr-only">Filtrar por setor</span>
          <Select size="sm" aria-label="Filtrar por setor" value={sectorId} onChange={(next) => { setSectorId(next); pagination.resetPage() }} options={[{ value: '', label: 'Todos os setores' }, ...(sectors.data ?? []).filter((sector) => !hospitalId || sector.hospitalId === hospitalId).map((sector) => ({ value: sector.id, label: sector.nome }))]} />
        </label>
        <label className="min-w-0">
          <span className="sr-only">Filtrar por status</span>
          <Select size="sm" aria-label="Filtrar por status" value={status} onChange={(next) => pagination.setFilters({ status: next })} options={lifecycleOptions} />
        </label>
        <label className="min-w-0">
          <span className="sr-only">Filtrar por categoria</span>
          <Select size="sm" aria-label="Filtrar por categoria" value={categoryFilter} onChange={(next) => { setCategoryFilter(next); pagination.resetPage() }} options={[{ value: '', label: 'Todas as categorias' }, { value: NO_CATEGORY, label: 'Sem categoria' }, ...(categories.data ?? []).map((category) => ({ value: category.id, label: category.ativa ? category.nome : `${category.nome} (inativa)` }))]} />
        </label>
        <label className="min-w-0">
          <span className="sr-only">Filtrar por documentos</span>
          <Select size="sm" aria-label="Filtrar por documentos" value={documentsFilter} onChange={(next) => changeDocumentsFilter(parseDocumentsFilter(next))} options={documentsOptions} />
        </label>
        <label className="relative min-w-0 sm:col-span-2">
          <span className="sr-only">Buscar equipamento</span>
          <Search aria-hidden="true" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input aria-label="Buscar equipamento" type="search" value={search.input} onChange={(event) => search.setInput(event.target.value)} placeholder="Código, nome, modelo, série…" title="Busca por código, nome, modelo, série ou categoria" className={`${inputClass} truncate pl-8`} />
        </label>
      </FilterBar>

    {hospitals.isError ? <ErrorState message="Não foi possível carregar os hospitais para os filtros." onRetry={() => void hospitals.refetch()} /> : null}
    <EquipmentListTable
      items={equipment.data?.items ?? []}
      sort={sort}
      onSortChange={onSortChange}
      pagination={{ page: pagination.page, size: pagination.size, total, onPageChange: pagination.setPage, onSizeChange: pagination.setSize }}
      sectorNameById={sectorNameById}
      isLoading={equipment.isLoading}
      error={equipment.isError ? { message: 'Não foi possível carregar os equipamentos.', onRetry: () => void equipment.refetch() } : null}
      empty={hasEquipment
        ? { title: 'Nenhum equipamento encontrado', description: 'Ajuste os filtros ou a busca para ver outros equipamentos.', action: <button type="button" onClick={clearFilters} className="text-xs font-semibold text-primary underline">Limpar filtros</button> }
        : { title: 'Nenhum equipamento cadastrado', description: 'Cadastre um equipamento para começar a acompanhar os ativos.', action: isAdmin ? <PageAction to="/assets/new" fullWidthMobile>Cadastrar equipamento</PageAction> : undefined }}
    />
  </AdminPageShell>
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <section role="alert" className="mb-4 rounded-lg border border-danger/40 bg-surface p-4 text-sm"><p>{message}</p><button type="button" onClick={onRetry} className="mt-2 text-xs font-semibold text-primary underline">Tentar novamente</button></section>
}
