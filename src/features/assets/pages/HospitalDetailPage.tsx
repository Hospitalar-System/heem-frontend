import { ArrowLeft, Building2, Package, Pencil, Rows3, type LucideIcon } from 'lucide-react'
import { useMemo, useState, type KeyboardEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { PageAction } from '@/components/ui/PageAction'
import { DataTable, type DataColumn } from '@/components/ui/DataTable'
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

  const sectorColumns: DataColumn<Setor>[] = [
    { key: 'codigo', header: 'Código', cell: (sector) => <span className="font-semibold">{sector.codigo}</span> },
    { key: 'nome', header: 'Nome', cell: (sector) => <span className="text-sm font-medium text-text-primary">{sector.nome}</span> },
    { key: 'andar', header: 'Andar', cell: (sector) => <span className="text-text-secondary">{sector.andar || '—'}</span> },
    { key: 'risco', header: 'Classificação de risco', cell: (sector) => <span className="text-text-secondary">{riskLabels[sector.classificacaoRisco]}</span> },
    { key: 'grupo', header: 'Grupo de instalação', cell: (sector) => <span className="text-text-secondary">{groupLabels[sector.grupoInstalacao]}</span> },
    { key: 'equipamentos', header: 'Equipamentos', cell: (sector) => <span className="tabular-nums text-text-secondary" data-testid={`sector-count-${sector.id}`}>{equipment.data ? countBySector.get(sector.id) ?? 0 : '—'}</span> },
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
            <dl className="grid gap-4 sm:grid-cols-2"><div><dt className="text-[11px] uppercase text-text-muted">Nome</dt><dd className="mt-1 text-sm font-medium">{hospital.data?.nome}</dd></div><div><dt className="text-[11px] uppercase text-text-muted">CNPJ</dt><dd className="mt-1 text-sm">{formatCnpj(hospital.data?.cnpj ?? '') || '—'}</dd></div><div><dt className="text-[11px] uppercase text-text-muted">Setores</dt><dd className="mt-1 text-sm tabular-nums">{sectors.data?.length ?? '—'}</dd></div><div><dt className="text-[11px] uppercase text-text-muted">Equipamentos</dt><dd className="mt-1 text-sm tabular-nums">{equipment.data?.length ?? '—'}</dd></div></dl>
            <div className="mt-5 flex justify-end border-t border-border pt-4"><button type="button" onClick={() => setEditingHospital(true)} className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-xs font-medium hover:bg-bg"><Pencil size={14} /> Editar hospital</button></div>
          </>}
        </div> : null}

        {activeTab === 'setores' ? <>
          <DataTable
            label="Setores"
            columns={sectorColumns}
            rows={sectors.data ?? []}
            getRowId={(sector) => sector.id}
            rowLabel={(sector) => sector.nome}
            rowActions={(sector) => [{ label: 'Editar', icon: <Pencil size={14} />, onSelect: () => setEditingSector(sector) }]}
            isLoading={sectors.isLoading}
            loadingLabel="Carregando setores"
            minWidth="860px"
            error={sectors.isError ? { message: 'Não foi possível carregar os setores deste hospital.', onRetry: () => void sectors.refetch() } : null}
            empty={{ icon: <Rows3 />, title: 'Nenhum setor cadastrado', description: `Adicione o primeiro setor de ${hospital.data?.nome ?? 'este hospital'}.`, action: <PageAction onClick={() => setCreatingSector(true)} fullWidthMobile>Criar setor</PageAction> }}
          />
          {equipment.isError && !sectors.isError ? <p role="alert" className="mt-3 text-xs text-text-muted">Não foi possível carregar a contagem de equipamentos por setor.</p> : null}
        </> : null}

        {activeTab === 'equipamentos' ? <>
          <div className="mb-4 grid gap-2 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
            <Select size="sm" aria-label="Filtrar por setor" value={sectorFilter} onChange={setSectorFilter} options={[{ value: '', label: 'Todos os setores' }, ...(sectors.data ?? []).map((sector) => ({ value: sector.id, label: sector.nome }))]} />
            <input aria-label="Buscar equipamento" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Código, nome, modelo, série…" className={inputClass} />
          </div>
          <EquipmentListTable
            items={visibleEquipment}
            sectorNameById={sectorNameById}
            isLoading={equipment.isLoading}
            error={equipment.isError ? { message: 'Não foi possível carregar os equipamentos.', onRetry: () => void equipment.refetch() } : null}
            empty={{ title: (equipment.data?.length ?? 0) === 0 ? 'Nenhum equipamento neste hospital' : 'Nenhum equipamento encontrado' }}
          />
        </> : null}
      </section>
    </>}
    {editingHospital && hospital.data && <HospitalForm hospital={hospital.data} onClose={() => setEditingHospital(false)} onSaved={() => setEditingHospital(false)} />}
    {creatingSector && <SectorForm hospitalId={id} onClose={() => setCreatingSector(false)} onSaved={() => setCreatingSector(false)} />}
    {editingSector && <SectorForm sector={editingSector} hospitalId={id} onClose={() => setEditingSector(null)} onSaved={() => setEditingSector(null)} />}
  </AdminPageShell>
}
