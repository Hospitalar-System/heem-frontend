import { useMemo, useState, useSyncExternalStore } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { getAuthState, subscribeAuthState } from '@/features/auth/session'
import { EquipmentStatusBadge } from '../components/EquipmentStatusBadge'
import { EquipmentThumb } from '../components/EquipmentPhotoSection'
import { useEquipments, useHospitals, useSectorsForHospitals } from '../api/assets'
import { useCategories } from '../api/categories'
import type { EquipmentLifecycle } from '../types'
import { Select } from '@/components/ui/Select'
import { addDays, formatBr, isoOf, parseDate, todayCivil } from '@/components/ui/civil-date'

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

function DocumentsIndicator({ vencidos, vencendo, proximaValidade }: { vencidos?: number | null; vencendo?: number | null; proximaValidade?: string | null }) {
  const expired = vencidos ?? 0
  const expiring = vencendo ?? 0
  if (expired === 0 && expiring === 0) return <span className="text-text-muted" aria-label="Sem documentos com atenção">—</span>
  const next = parseDate(proximaValidade)
  const expiredText = `${expired} ${expired === 1 ? 'vencido' : 'vencidos'}`
  const expiringText = `${expiring} vencendo`
  const nextText = next ? formatBr(next) : null
  const label = [expired > 0 ? expiredText : null, expiring > 0 ? expiringText : null, nextText ? `próxima validade ${nextText}` : null].filter(Boolean).join(', ')
  return <span className="flex flex-col gap-0.5" role="group" aria-label={`Documentos: ${label}`}>
    <span className="flex flex-wrap gap-x-2 font-semibold">
      {expired > 0 ? <span className="text-danger">{expiredText}</span> : null}
      {expiring > 0 ? <span className="text-warning">{expiringText}</span> : null}
    </span>
    {nextText ? <span className="text-[11px] text-text-muted">Próx.: {nextText}</span> : null}
  </span>
}

export function AssetsPage() {
  const navigate = useNavigate()
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
  const sectorById = useMemo(() => new Map((sectors.data ?? []).map((sector) => [sector.id, sector])), [sectors.data])
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

  return <AdminPageShell title="Equipamentos" subtitle="Ativos dos hospitais do tenant">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 flex-wrap gap-2">
        <label className="min-w-[180px] flex-1 sm:max-w-[230px]">
          <span className="sr-only">Filtrar por hospital</span>
          <Select size="sm" aria-label="Filtrar por hospital" value={hospitalId} onChange={(next) => { setHospitalId(next); setSectorId('') }} options={[{ value: '', label: 'Todos os hospitais' }, ...(hospitals.data ?? []).map((hospital) => ({ value: hospital.id, label: hospital.nome }))]} />
        </label>
        <label className="min-w-[160px] flex-1 sm:max-w-[210px]">
          <span className="sr-only">Filtrar por setor</span>
          <Select size="sm" aria-label="Filtrar por setor" value={sectorId} onChange={setSectorId} options={[{ value: '', label: 'Todos os setores' }, ...(sectors.data ?? []).filter((sector) => !hospitalId || sector.hospitalId === hospitalId).map((sector) => ({ value: sector.id, label: sector.nome }))]} />
        </label>
        <label className="min-w-[160px] flex-1 sm:max-w-[190px]">
          <span className="sr-only">Filtrar por status</span>
          <Select size="sm" aria-label="Filtrar por status" value={status} onChange={(next) => setStatus(next as EquipmentLifecycle | '')} options={lifecycleOptions} />
        </label>
        <label className="min-w-[170px] flex-1 sm:max-w-[220px]">
          <span className="sr-only">Filtrar por categoria</span>
          <Select size="sm" aria-label="Filtrar por categoria" value={categoryFilter} onChange={setCategoryFilter} options={[{ value: '', label: 'Todas as categorias' }, { value: NO_CATEGORY, label: 'Sem categoria' }, ...(categories.data ?? []).map((category) => ({ value: category.id, label: category.ativa ? category.nome : `${category.nome} (inativa)` }))]} />
        </label>
        <label className="min-w-[170px] flex-1 sm:max-w-[200px]">
          <span className="sr-only">Filtrar por documentos</span>
          <Select size="sm" aria-label="Filtrar por documentos" value={documentsFilter} onChange={(next) => changeDocumentsFilter(parseDocumentsFilter(next))} options={documentsOptions} />
        </label>
        <label className="relative min-w-[200px] flex-1 sm:max-w-[280px]">
          <span className="sr-only">Buscar equipamento</span>
          <Search aria-hidden="true" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input aria-label="Buscar equipamento" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Código, nome, modelo, série ou categoria" className={`${inputClass} pl-8`} />
        </label>
      </div>
      {isAdmin && <button type="button" onClick={() => navigate('/assets/new')} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg"><Plus size={14} />Novo equipamento</button>}
    </div>

    {hospitals.isError ? <ErrorState message="Não foi possível carregar os hospitais para os filtros." onRetry={() => void hospitals.refetch()} /> : null}
    {equipment.isError ? <ErrorState message="Não foi possível carregar os equipamentos." onRetry={() => void equipment.refetch()} /> : null}
    {equipment.isLoading ? <div aria-label="Carregando equipamentos" aria-busy="true" className="space-y-2 rounded-lg border border-border bg-surface p-4">{Array.from({ length: 7 }, (_, index) => <div key={index} className="h-10 animate-pulse rounded bg-bg" />)}</div> : null}
    {!equipment.isLoading && !equipment.isError && visibleEquipment.length === 0 ? <section className="grid min-h-64 place-items-center rounded-lg border border-dashed border-border bg-surface p-8 text-center">
      <div><h2 className="text-base font-semibold">{(equipment.data?.length ?? 0) === 0 ? 'Nenhum equipamento cadastrado' : 'Nenhum equipamento encontrado'}</h2><p className="mt-1 max-w-md text-sm text-text-secondary">{(equipment.data?.length ?? 0) === 0 ? 'Cadastre um equipamento para começar a acompanhar os ativos.' : 'Ajuste os filtros ou a busca para ver outros equipamentos.'}</p>
        {(equipment.data?.length ?? 0) === 0 && isAdmin ? <button type="button" onClick={() => navigate('/assets/new')} className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand"><Plus size={14} />Cadastrar equipamento</button> : null}
        {(equipment.data?.length ?? 0) > 0 ? <button type="button" onClick={clearFilters} className="mt-4 text-xs font-semibold text-primary underline">Limpar filtros</button> : null}
      </div>
    </section> : null}
    {!equipment.isLoading && !equipment.isError && visibleEquipment.length > 0 ? <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[1200px] border-collapse text-left">
        <thead><tr className="table-head h-12 text-[11px]">{['Código', 'Nome', 'Categoria', 'Modelo', 'Nº série', 'Setor', 'Últ. manut.', 'Documentos', 'Status'].map((heading) => <th key={heading} scope="col" className="px-4">{heading}</th>)}</tr></thead>
        <tbody>{visibleEquipment.map((item) => <tr key={item.id} role="link" tabIndex={0} aria-label={`Abrir ${item.codigo}, ${item.nome}`} onClick={() => navigate(`/assets/${item.id}`)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(`/assets/${item.id}`) } }} className="h-12 row-clickable border-b border-border/70 text-xs last:border-0">
          <td className="whitespace-nowrap px-4 font-medium text-text-secondary">{item.codigo}</td><td className="max-w-[320px] px-4 text-sm font-medium text-text-primary"><span className="flex items-center gap-3"><EquipmentThumb equipmentId={item.id} nome={item.nome} fotoVersao={item.fotoVersao} /><span className="truncate">{item.nome}</span></span></td><td className="px-4 text-text-secondary">{item.categoriaNome ?? <span className="text-text-muted">Sem categoria</span>}</td><td className="px-4 text-text-secondary">{item.modelo || '—'}</td><td className="px-4 text-text-secondary">{item.numeroSerie || '—'}</td><td className="px-4 text-text-secondary">{sectorById.get(item.setorId)?.nome ?? '—'}</td><td className="px-4 text-text-muted" title="A API não fornece a data da última manutenção na listagem">—</td><td className="px-4"><DocumentsIndicator vencidos={item.documentosVencidos} vencendo={item.documentosVencendo} proximaValidade={item.proximaValidade} /></td><td className="px-4"><EquipmentStatusBadge status={item.statusCicloVida} /></td>
        </tr>)}</tbody>
      </table>
    </div> : null}
  </AdminPageShell>
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <section role="alert" className="mb-4 rounded-lg border border-danger/40 bg-surface p-4 text-sm"><p>{message}</p><button type="button" onClick={onRetry} className="mt-2 text-xs font-semibold text-primary underline">Tentar novamente</button></section>
}
