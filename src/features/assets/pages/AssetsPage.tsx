import { useMemo, useState, useSyncExternalStore } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { getAuthState, subscribeAuthState } from '@/features/auth/session'
import { EquipmentListTable } from '../components/EquipmentListTable'
import { useEquipments, useHospitals, useSectorsForHospitals } from '../api/assets'
import { useCategories } from '../api/categories'
import type { EquipmentLifecycle } from '../types'
import { Select } from '@/components/ui/Select'
import { PageAction } from '@/components/ui/PageAction'
import { FilterBar } from '@/components/ui/FilterBar'
import { addDays, isoOf, todayCivil } from '@/components/ui/civil-date'

const inputClass = 'h-9 w-full rounded-md border border-border bg-bg px-3 text-xs text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'
const lifecycleOptions: Array<{ value: EquipmentLifecycle | ''; label: string }> = [
  { value: '', label: 'Todos os status' },
  { value: 'ATIVO', label: 'Ativo' },
  { value: 'EM_MANUTENCAO', label: 'Em manutenção' },
  { value: 'INATIVO', label: 'Inativo' },
  { value: 'DESATIVADO', label: 'Desativado' },
  { value: 'DESCARTADO', label: 'Descartado' },
]

const NO_CATEGORY = '__sem_categoria__'
/** Janela de "vencendo" do painel (documentosVencendo30d). */
const EXPIRING_WINDOW_DAYS = 30
type DocumentsFilter = '' | 'vencendo' | 'vencido'
const documentsOptions: Array<{ value: DocumentsFilter; label: string }> = [
  { value: '', label: 'Documentos: todos' },
  { value: 'vencendo', label: 'Vencendo em 30 dias' },
  { value: 'vencido', label: 'Documento vencido' },
]
const parseDocumentsFilter = (value: string | null): DocumentsFilter => (value === 'vencendo' || value === 'vencido' ? value : '')

export function AssetsPage() {
  const auth = useSyncExternalStore(subscribeAuthState, getAuthState, getAuthState)
  const isAdmin = auth.user?.roles.includes('admin_cliente') ?? false
  const hospitals = useHospitals()
  const [hospitalId, setHospitalId] = useState('')
  const [sectorId, setSectorId] = useState('')
  const [status, setStatus] = useState<EquipmentLifecycle | ''>('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const categories = useCategories()
  const [search, setSearch] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const [documentsFilter, setDocumentsFilter] = useState<DocumentsFilter>(() => parseDocumentsFilter(searchParams.get('documentos')))
  const changeDocumentsFilter = (next: DocumentsFilter) => {
    setDocumentsFilter(next)
    setSearchParams((current) => { const params = new URLSearchParams(current); if (next) params.set('documentos', next); else params.delete('documentos'); return params }, { replace: true })
  }
  const expiringUntil = documentsFilter === 'vencendo' ? isoOf(addDays(todayCivil(), EXPIRING_WINDOW_DAYS)) : undefined
  const equipment = useEquipments({
    hospitalId: hospitalId || undefined,
    setorId: sectorId || undefined,
    categoriaId: categoryFilter && categoryFilter !== NO_CATEGORY ? categoryFilter : undefined,
    semCategoria: categoryFilter === NO_CATEGORY ? true : undefined,
    vencendoEm: expiringUntil,
    documentoVencido: documentsFilter === 'vencido' ? true : undefined,
  })
  const sectors = useSectorsForHospitals(hospitals.data?.map(({ id }) => id) ?? [])
  const sectorNameById = useMemo(() => new Map((sectors.data ?? []).map((sector) => [sector.id, sector.nome])), [sectors.data])
  const visibleEquipment = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    return (equipment.data ?? []).filter((item) => {
      if (status && item.statusCicloVida !== status) return false
      if (!term) return true
      return [item.codigo, item.nome, item.modelo, item.numeroSerie, item.categoriaNome]
        .some((value) => value?.toLocaleLowerCase('pt-BR').includes(term))
    })
  }, [equipment.data, search, status])

  const clearFilters = () => { setHospitalId(''); setSectorId(''); setStatus(''); setCategoryFilter(''); changeDocumentsFilter(''); setSearch('') }

  return <AdminPageShell title="Equipamentos" subtitle="Ativos dos hospitais do tenant" action={isAdmin ? <PageAction to="/assets/new" collapseLabelOnMobile>Novo equipamento</PageAction> : undefined}>
    <FilterBar label="Filtros de equipamentos" className="mb-4">
        <label className="min-w-0">
          <span className="sr-only">Filtrar por hospital</span>
          <Select size="sm" aria-label="Filtrar por hospital" value={hospitalId} onChange={(next) => { setHospitalId(next); setSectorId('') }} options={[{ value: '', label: 'Todos os hospitais' }, ...(hospitals.data ?? []).map((hospital) => ({ value: hospital.id, label: hospital.nome }))]} />
        </label>
        <label className="min-w-0">
          <span className="sr-only">Filtrar por setor</span>
          <Select size="sm" aria-label="Filtrar por setor" value={sectorId} onChange={setSectorId} options={[{ value: '', label: 'Todos os setores' }, ...(sectors.data ?? []).filter((sector) => !hospitalId || sector.hospitalId === hospitalId).map((sector) => ({ value: sector.id, label: sector.nome }))]} />
        </label>
        <label className="min-w-0">
          <span className="sr-only">Filtrar por status</span>
          <Select size="sm" aria-label="Filtrar por status" value={status} onChange={(next) => setStatus(next as EquipmentLifecycle | '')} options={lifecycleOptions} />
        </label>
        <label className="min-w-0">
          <span className="sr-only">Filtrar por categoria</span>
          <Select size="sm" aria-label="Filtrar por categoria" value={categoryFilter} onChange={setCategoryFilter} options={[{ value: '', label: 'Todas as categorias' }, { value: NO_CATEGORY, label: 'Sem categoria' }, ...(categories.data ?? []).map((category) => ({ value: category.id, label: category.ativa ? category.nome : `${category.nome} (inativa)` }))]} />
        </label>
        <label className="min-w-0">
          <span className="sr-only">Filtrar por documentos</span>
          <Select size="sm" aria-label="Filtrar por documentos" value={documentsFilter} onChange={(next) => changeDocumentsFilter(parseDocumentsFilter(next))} options={documentsOptions} />
        </label>
        <label className="relative min-w-0 sm:col-span-2">
          <span className="sr-only">Buscar equipamento</span>
          <Search aria-hidden="true" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input aria-label="Buscar equipamento" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Código, nome, modelo, série…" title="Busca por código, nome, modelo, série ou categoria" className={`${inputClass} truncate pl-8`} />
        </label>
      </FilterBar>

    {hospitals.isError ? <ErrorState message="Não foi possível carregar os hospitais para os filtros." onRetry={() => void hospitals.refetch()} /> : null}
    {equipment.isError ? <ErrorState message="Não foi possível carregar os equipamentos." onRetry={() => void equipment.refetch()} /> : null}
    {equipment.isLoading ? <div aria-label="Carregando equipamentos" aria-busy="true" className="space-y-2 rounded-lg border border-border bg-surface p-4">{Array.from({ length: 7 }, (_, index) => <div key={index} className="h-10 animate-pulse rounded bg-bg" />)}</div> : null}
    {!equipment.isLoading && !equipment.isError && visibleEquipment.length === 0 ? <section className="grid min-h-64 place-items-center rounded-lg border border-dashed border-border bg-surface p-8 text-center">
      <div><h2 className="text-base font-semibold">{(equipment.data?.length ?? 0) === 0 ? 'Nenhum equipamento cadastrado' : 'Nenhum equipamento encontrado'}</h2><p className="mt-1 max-w-md text-sm text-text-secondary">{(equipment.data?.length ?? 0) === 0 ? 'Cadastre um equipamento para começar a acompanhar os ativos.' : 'Ajuste os filtros ou a busca para ver outros equipamentos.'}</p>
        {(equipment.data?.length ?? 0) === 0 && isAdmin ? <div className="mt-4 flex justify-center"><PageAction to="/assets/new" fullWidthMobile>Cadastrar equipamento</PageAction></div> : null}
        {(equipment.data?.length ?? 0) > 0 ? <button type="button" onClick={clearFilters} className="mt-4 text-xs font-semibold text-primary underline">Limpar filtros</button> : null}
      </div>
    </section> : null}
    {!equipment.isLoading && !equipment.isError && visibleEquipment.length > 0 ? <EquipmentListTable items={visibleEquipment} sectorNameById={sectorNameById} /> : null}
  </AdminPageShell>
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <section role="alert" className="mb-4 rounded-lg border border-danger/40 bg-surface p-4 text-sm"><p>{message}</p><button type="button" onClick={onRetry} className="mt-2 text-xs font-semibold text-primary underline">Tentar novamente</button></section>
}
