import { ArrowLeft, Building2, Package, Pencil, Rows3, type LucideIcon } from 'lucide-react'
import { useMemo, useState, type KeyboardEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { PageAction } from '@/components/ui/PageAction'
import { RowActionsMenu } from '@/components/ui/RowActionsMenu'
import { Select } from '@/components/ui/Select'
import { useEquipments, useHospital, useSectors } from '../api/assets'
import { EquipmentListTable } from '../components/EquipmentListTable'
import { HospitalForm, formatCnpj } from '../components/HospitalForm'
import { SectorForm } from '../components/SectorForm'
import type { RiscoSetor, Setor } from '../types'

type HospitalTab = 'dados' | 'setores' | 'equipamentos'
const tabs: Array<{ id: HospitalTab; label: string; Icon: LucideIcon }> = [
  { id: 'dados', label: 'Dados', Icon: Building2 },
  { id: 'setores', label: 'Setores', Icon: Rows3 },
  { id: 'equipamentos', label: 'Equipamentos', Icon: Package },
]
const riskLabels: Record<RiscoSetor, string> = { CRITICO: 'Crítico', SEMI_CRITICO: 'Semicrítico', NAO_CRITICO: 'Não crítico' }
const groupLabels = { GRUPO_0: 'Grupo 0', GRUPO_1: 'Grupo 1', GRUPO_2: 'Grupo 2' }
const inputClass = 'h-9 w-full rounded-md border border-border bg-bg px-3 text-xs text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'
const parseTab = (value: string | null): HospitalTab => (tabs.some((tab) => tab.id === value) ? (value as HospitalTab) : 'dados')

export function HospitalDetailPage() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const activeTab = parseTab(params.get('aba'))
  const hospital = useHospital(id)
  const sectors = useSectors(id)
  const equipment = useEquipments({ hospitalId: id })
  const [editingHospital, setEditingHospital] = useState(false)
  const [creatingSector, setCreatingSector] = useState(false)
  const [editingSector, setEditingSector] = useState<Setor | null>(null)
  const [sectorFilter, setSectorFilter] = useState('')
  const [search, setSearch] = useState('')

  const setTab = (tab: HospitalTab) => setParams((current) => { const next = new URLSearchParams(current); next.set('aba', tab); return next }, { replace: true })
  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const next = tabs[(index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length].id
    setTab(next)
    document.getElementById(`hospital-tab-${next}`)?.focus()
  }

  // Uma única chamada de equipamentos do hospital alimenta a contagem por setor e a aba Equipamentos.
  const countBySector = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of equipment.data ?? []) counts.set(item.setorId, (counts.get(item.setorId) ?? 0) + 1)
    return counts
  }, [equipment.data])
  const sectorNameById = useMemo(() => new Map((sectors.data ?? []).map((sector) => [sector.id, sector.nome])), [sectors.data])
  const visibleEquipment = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    return (equipment.data ?? []).filter((item) => {
      if (sectorFilter && item.setorId !== sectorFilter) return false
      if (!term) return true
      return [item.codigo, item.nome, item.modelo, item.numeroSerie, item.categoriaNome].some((value) => value?.toLocaleLowerCase('pt-BR').includes(term))
    })
  }, [equipment.data, search, sectorFilter])

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
            <dl className="grid gap-4 sm:grid-cols-2"><div><dt className="text-[11px] uppercase text-text-muted">Nome</dt><dd className="mt-1 text-sm font-medium">{hospital.data?.nome}</dd></div><div><dt className="text-[11px] uppercase text-text-muted">CNPJ</dt><dd className="mt-1 text-sm">{formatCnpj(hospital.data?.cnpj ?? '') || '—'}</dd></div><div><dt className="text-[11px] uppercase text-text-muted">Setores</dt><dd className="mt-1 text-sm tabular-nums">{sectors.data?.length ?? '—'}</dd></div><div><dt className="text-[11px] uppercase text-text-muted">Equipamentos</dt><dd className="mt-1 text-sm tabular-nums">{equipment.data?.length ?? '—'}</dd></div></dl>
            <div className="mt-5 flex justify-end border-t border-border pt-4"><button type="button" onClick={() => setEditingHospital(true)} className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-xs font-medium hover:bg-bg"><Pencil size={14} /> Editar hospital</button></div>
          </>}
        </div> : null}

        {activeTab === 'setores' ? <>
          {sectors.isError ? <section role="alert" className="rounded-lg border border-border bg-surface p-6"><p>Não foi possível carregar os setores deste hospital.</p><button type="button" className="mt-3 text-sm text-primary underline" onClick={() => void sectors.refetch()}>Tentar novamente</button></section> : null}
          {sectors.isLoading ? <div aria-label="Carregando setores" aria-busy="true" className="h-64 animate-pulse rounded-lg border border-border bg-surface" /> : null}
          {!sectors.isLoading && !sectors.isError && (sectors.data?.length ?? 0) === 0 ? <section className="grid min-h-64 place-items-center rounded-lg border border-dashed border-border bg-surface p-8 text-center"><div><Rows3 className="mx-auto text-text-muted" /><h2 className="mt-3 font-semibold">Nenhum setor cadastrado</h2><p className="mt-1 text-sm text-text-secondary">Adicione o primeiro setor de {hospital.data?.nome ?? 'este hospital'}.</p><div className="mt-4 flex justify-center"><PageAction onClick={() => setCreatingSector(true)} fullWidthMobile>Criar setor</PageAction></div></div></section> : null}
          {!sectors.isLoading && !sectors.isError && (sectors.data?.length ?? 0) > 0 ? <div className="overflow-x-auto rounded-lg border border-border bg-surface"><table className="w-full min-w-[860px] border-collapse text-left"><thead><tr className="table-head text-[11px] uppercase">{['Código', 'Nome', 'Andar', 'Classificação de risco', 'Grupo de instalação', 'Equipamentos', ''].map((heading, index) => <th key={`${heading}${index}`} scope="col" className="px-4 py-3 font-medium">{heading || <span className="sr-only">Ações</span>}</th>)}</tr></thead><tbody>{sectors.data?.map((sector) => <tr key={sector.id} className="border-b border-border/70 last:border-0"><td className="px-4 py-3 text-xs font-semibold">{sector.codigo}</td><td className="px-4 py-3 text-sm">{sector.nome}</td><td className="px-4 py-3 text-sm text-text-secondary">{sector.andar || '—'}</td><td className="px-4 py-3 text-sm text-text-secondary">{riskLabels[sector.classificacaoRisco]}</td><td className="px-4 py-3 text-sm text-text-secondary">{groupLabels[sector.grupoInstalacao]}</td><td className="px-4 py-3 text-sm tabular-nums" data-testid={`sector-count-${sector.id}`}>{equipment.data ? countBySector.get(sector.id) ?? 0 : '—'}</td><td className="px-4 py-3"><div className="flex justify-end"><RowActionsMenu label={sector.nome} actions={[{ label: 'Editar', icon: <Pencil size={14} />, onSelect: () => setEditingSector(sector) }]} /></div></td></tr>)}</tbody></table></div> : null}
          {equipment.isError && !sectors.isError ? <p role="alert" className="mt-3 text-xs text-text-muted">Não foi possível carregar a contagem de equipamentos por setor.</p> : null}
        </> : null}

        {activeTab === 'equipamentos' ? <>
          <div className="mb-4 grid gap-2 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
            <Select size="sm" aria-label="Filtrar por setor" value={sectorFilter} onChange={setSectorFilter} options={[{ value: '', label: 'Todos os setores' }, ...(sectors.data ?? []).map((sector) => ({ value: sector.id, label: sector.nome }))]} />
            <input aria-label="Buscar equipamento" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Código, nome, modelo, série…" className={inputClass} />
          </div>
          {equipment.isError ? <section role="alert" className="rounded-lg border border-danger/40 bg-surface p-4 text-sm"><p>Não foi possível carregar os equipamentos.</p><button type="button" onClick={() => void equipment.refetch()} className="mt-2 text-xs font-semibold text-primary underline">Tentar novamente</button></section> : null}
          {equipment.isLoading ? <div aria-label="Carregando equipamentos" aria-busy="true" className="h-48 animate-pulse rounded-lg border border-border bg-surface" /> : null}
          {!equipment.isLoading && !equipment.isError && visibleEquipment.length === 0 ? <section className="grid min-h-48 place-items-center rounded-lg border border-dashed border-border bg-surface p-8 text-center"><h2 className="text-base font-semibold">{(equipment.data?.length ?? 0) === 0 ? 'Nenhum equipamento neste hospital' : 'Nenhum equipamento encontrado'}</h2></section> : null}
          {!equipment.isLoading && !equipment.isError && visibleEquipment.length > 0 ? <EquipmentListTable items={visibleEquipment} sectorNameById={sectorNameById} /> : null}
        </> : null}
      </section>
    </>}
    {editingHospital && hospital.data && <HospitalForm hospital={hospital.data} onClose={() => setEditingHospital(false)} onSaved={() => setEditingHospital(false)} />}
    {creatingSector && <SectorForm hospitalId={id} onClose={() => setCreatingSector(false)} onSaved={() => setCreatingSector(false)} />}
    {editingSector && <SectorForm sector={editingSector} hospitalId={id} onClose={() => setEditingSector(null)} onSaved={() => setEditingSector(null)} />}
  </AdminPageShell>
}
