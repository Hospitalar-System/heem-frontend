import { useMemo, useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { getAuthState, subscribeAuthState } from '@/features/auth/session'
import { EquipmentStatusBadge } from '../components/EquipmentStatusBadge'
import { useEquipments, useHospitals, useSectorsForHospitals } from '../api/assets'
import type { EquipmentLifecycle } from '../types'

const inputClass = 'h-9 w-full rounded-md border border-border bg-bg px-3 text-xs text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'
const lifecycleOptions: Array<{ value: EquipmentLifecycle | ''; label: string }> = [
  { value: '', label: 'Todos os status' },
  { value: 'ATIVO', label: 'Ativo' },
  { value: 'EM_MANUTENCAO', label: 'Em manutenção' },
  { value: 'INATIVO', label: 'Inativo' },
  { value: 'DESATIVADO', label: 'Desativado' },
  { value: 'DESCARTADO', label: 'Descartado' },
]

export function AssetsPage() {
  const navigate = useNavigate()
  const auth = useSyncExternalStore(subscribeAuthState, getAuthState, getAuthState)
  const isAdmin = auth.user?.roles.includes('admin_cliente') ?? false
  const hospitals = useHospitals()
  const [hospitalId, setHospitalId] = useState('')
  const [sectorId, setSectorId] = useState('')
  const [status, setStatus] = useState<EquipmentLifecycle | ''>('')
  const [search, setSearch] = useState('')
  const equipment = useEquipments({ hospitalId: hospitalId || undefined, setorId: sectorId || undefined })
  const sectors = useSectorsForHospitals(hospitals.data?.map(({ id }) => id) ?? [])
  const sectorById = useMemo(() => new Map((sectors.data ?? []).map((sector) => [sector.id, sector])), [sectors.data])
  const visibleEquipment = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    return (equipment.data ?? []).filter((item) => {
      if (status && item.statusCicloVida !== status) return false
      if (!term) return true
      return [item.codigo, item.nome, item.modelo, item.numeroSerie]
        .some((value) => value?.toLocaleLowerCase('pt-BR').includes(term))
    })
  }, [equipment.data, search, status])

  const clearFilters = () => { setHospitalId(''); setSectorId(''); setStatus(''); setSearch('') }

  return <AdminPageShell title="Equipamentos" subtitle="Ativos dos hospitais do tenant">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 flex-wrap gap-2">
        <label className="min-w-[180px] flex-1 sm:max-w-[230px]">
          <span className="sr-only">Filtrar por hospital</span>
          <select aria-label="Filtrar por hospital" value={hospitalId} onChange={(event) => { setHospitalId(event.target.value); setSectorId('') }} className={inputClass}>
            <option value="">Todos os hospitais</option>
            {hospitals.data?.map((hospital) => <option key={hospital.id} value={hospital.id}>{hospital.nome}</option>)}
          </select>
        </label>
        <label className="min-w-[160px] flex-1 sm:max-w-[210px]">
          <span className="sr-only">Filtrar por setor</span>
          <select aria-label="Filtrar por setor" value={sectorId} onChange={(event) => setSectorId(event.target.value)} className={inputClass}>
            <option value="">Todos os setores</option>
            {sectors.data?.filter((sector) => !hospitalId || sector.hospitalId === hospitalId).map((sector) => <option key={sector.id} value={sector.id}>{sector.nome}</option>)}
          </select>
        </label>
        <label className="min-w-[160px] flex-1 sm:max-w-[190px]">
          <span className="sr-only">Filtrar por status</span>
          <select aria-label="Filtrar por status" value={status} onChange={(event) => setStatus(event.target.value as EquipmentLifecycle | '')} className={inputClass}>
            {lifecycleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="relative min-w-[200px] flex-1 sm:max-w-[280px]">
          <span className="sr-only">Buscar equipamento</span>
          <Search aria-hidden="true" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input aria-label="Buscar equipamento" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Código, nome, modelo ou série" className={`${inputClass} pl-8`} />
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
      <table className="w-full min-w-[980px] border-collapse text-left">
        <thead><tr className="h-12 border-b border-border bg-bg text-[11px] font-medium text-text-muted">{['Código', 'Nome', 'Modelo', 'Nº série', 'Setor', 'Últ. manut.', 'Status'].map((heading) => <th key={heading} scope="col" className="px-4">{heading}</th>)}</tr></thead>
        <tbody>{visibleEquipment.map((item) => <tr key={item.id} role="link" tabIndex={0} aria-label={`Abrir ${item.codigo}, ${item.nome}`} onClick={() => navigate(`/assets/${item.id}`)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(`/assets/${item.id}`) } }} className="h-12 cursor-pointer border-b border-border/70 text-xs last:border-0 hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
          <td className="whitespace-nowrap px-4 font-medium text-text-secondary">{item.codigo}</td><td className="max-w-[280px] truncate px-4 text-sm font-medium text-text-primary">{item.nome}</td><td className="px-4 text-text-secondary">{item.modelo || '—'}</td><td className="px-4 text-text-secondary">{item.numeroSerie || '—'}</td><td className="px-4 text-text-secondary">{sectorById.get(item.setorId)?.nome ?? '—'}</td><td className="px-4 text-text-muted" title="A API não fornece a data da última manutenção na listagem">—</td><td className="px-4"><EquipmentStatusBadge status={item.statusCicloVida} /></td>
        </tr>)}</tbody>
      </table>
    </div> : null}
  </AdminPageShell>
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <section role="alert" className="mb-4 rounded-lg border border-danger/40 bg-surface p-4 text-sm"><p>{message}</p><button type="button" onClick={onRetry} className="mt-2 text-xs font-semibold text-primary underline">Tentar novamente</button></section>
}
