import { ArrowLeft, Pencil, Plus, Wrench } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { Field, Modal } from '@/components/ui/Modal'
import { useHospitals, useSaveSector, useSector, useSectors } from '../api/assets'
import { setorSchema } from '../schemas/assets.schema'
import type { RiscoSetor, Setor, SetorInput } from '../types'
import { Select } from '@/components/ui/Select'
import { FormSelect } from '@/components/ui/FormSelect'

const inputClass = 'h-10 w-full rounded-md border border-border bg-bg px-3 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'
const riskLabels: Record<RiscoSetor, string> = { CRITICO: 'Crítico', SEMI_CRITICO: 'Semicrítico', NAO_CRITICO: 'Não crítico' }
const groupLabels = { GRUPO_0: 'Grupo 0', GRUPO_1: 'Grupo 1', GRUPO_2: 'Grupo 2' }

export function SectorsPage() {
  const [params, setParams] = useSearchParams()
  const hospitalId = params.get('hospitalId') ?? ''
  const hospitals = useHospitals()
  const currentHospital = hospitals.data?.find((hospital) => hospital.id === hospitalId)
  const sectors = useSectors(hospitalId)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Setor | null>(null)

  return <AdminPageShell title="Setores" subtitle={currentHospital?.nome ?? 'Selecione um hospital'} action={hospitalId ? <button type="button" onClick={() => setCreating(true)} className="inline-flex h-[38px] items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand"><Plus size={15} /> Novo setor</button> : undefined}>
    <div className="mb-5"><Link to="/hospitals" className="inline-flex items-center gap-2 text-xs text-text-secondary hover:text-primary"><ArrowLeft size={14} /> Hospitais</Link></div>
    {!hospitalId ? <section className="max-w-xl rounded-lg border border-border bg-surface p-5"><h2 className="font-semibold">Escolha um hospital</h2><p className="mt-1 text-sm text-text-secondary">Os setores são organizados dentro de um hospital.</p>{hospitals.isLoading ? <p className="mt-4 animate-pulse text-sm text-text-muted">Carregando hospitais…</p> : hospitals.isError ? <p role="alert" className="mt-4 text-sm text-danger">Não foi possível carregar os hospitais.</p> : hospitals.data?.length ? <Select aria-label="Hospital" value="" onChange={(next) => setParams({ hospitalId: next })} placeholder="Selecionar hospital" className="mt-4" options={hospitals.data.map((hospital) => ({ value: hospital.id, label: hospital.nome }))} /> : <p className="mt-4 text-sm text-text-secondary">Cadastre um hospital antes de adicionar setores.</p>}</section> : null}
    {hospitalId && (hospitals.isError || sectors.isError) ? <section role="alert" className="rounded-lg border border-border bg-surface p-6"><p>Não foi possível carregar os setores deste hospital.</p><button type="button" className="mt-3 text-sm text-primary underline" onClick={() => void sectors.refetch()}>Tentar novamente</button></section> : null}
    {hospitalId && sectors.isLoading ? <div aria-label="Carregando setores" aria-busy="true" className="h-64 animate-pulse rounded-lg border border-border bg-surface" /> : null}
    {hospitalId && !sectors.isLoading && !sectors.isError && (sectors.data?.length ?? 0) === 0 ? <section className="grid min-h-64 place-items-center rounded-lg border border-dashed border-border bg-surface p-8 text-center"><div><Wrench className="mx-auto text-text-muted" /><h2 className="mt-3 font-semibold">Nenhum setor cadastrado</h2><p className="mt-1 text-sm text-text-secondary">Adicione o primeiro setor de {currentHospital?.nome ?? 'este hospital'}.</p><button type="button" onClick={() => setCreating(true)} className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-bg-brand"><Plus size={14} /> Criar setor</button></div></section> : null}
    {hospitalId && !sectors.isLoading && !sectors.isError && (sectors.data?.length ?? 0) > 0 ? <div className="overflow-x-auto rounded-lg border border-border bg-surface"><table className="w-full min-w-[760px] border-collapse text-left"><thead><tr className="table-head text-[11px] uppercase">{['Código', 'Nome', 'Andar', 'Classificação de risco', 'Grupo de instalação', ''].map((heading, index) => <th key={`${heading}${index}`} className="px-4 py-3 font-medium">{heading}</th>)}</tr></thead><tbody>{sectors.data?.map((sector) => <tr key={sector.id} className="border-b border-border/70 last:border-0"><td className="px-4 py-3 text-xs font-semibold">{sector.codigo}</td><td className="px-4 py-3 text-sm">{sector.nome}</td><td className="px-4 py-3 text-sm text-text-secondary">{sector.andar || '—'}</td><td className="px-4 py-3 text-sm text-text-secondary">{riskLabels[sector.classificacaoRisco]}</td><td className="px-4 py-3 text-sm text-text-secondary">{groupLabels[sector.grupoInstalacao]}</td><td className="px-4 py-3 text-right"><button type="button" aria-label={`Editar ${sector.nome}`} onClick={() => setEditing(sector)} className="grid size-8 place-items-center rounded-md text-text-secondary hover:bg-bg"><Pencil size={14} /></button></td></tr>)}</tbody></table></div> : null}
    {creating && <SectorForm hospitalId={hospitalId} onClose={() => setCreating(false)} onSaved={() => setCreating(false)} />}
    {editing && <SectorForm sector={editing} hospitalId={hospitalId} onClose={() => setEditing(null)} onSaved={() => setEditing(null)} />}
  </AdminPageShell>
}

function SectorForm({ hospitalId, sector, onClose, onSaved }: { hospitalId: string; sector?: Setor; onClose: () => void; onSaved: () => void }) {
  const detail = useSector(sector?.id ?? '')
  const save = useSaveSector()
  const form = useForm<SetorInput>({ resolver: zodResolver(setorSchema), values: sector ? { codigo: detail.data?.codigo ?? sector.codigo, nome: detail.data?.nome ?? sector.nome, andar: detail.data?.andar ?? sector.andar ?? '', classificacaoRisco: detail.data?.classificacaoRisco ?? sector.classificacaoRisco, grupoInstalacao: detail.data?.grupoInstalacao ?? sector.grupoInstalacao } : { codigo: '', nome: '', andar: '', classificacaoRisco: 'NAO_CRITICO', grupoInstalacao: 'GRUPO_0' } })
  const submit = form.handleSubmit(async (data) => { try { await save.mutateAsync({ id: sector?.id, hospitalId, data }); toast.success(sector ? 'Setor atualizado.' : 'Setor cadastrado.'); onSaved() } catch { toast.error('Não foi possível salvar o setor.') } })
  return <Modal title={sector ? 'Editar setor' : 'Novo setor'} description="O setor será associado ao hospital selecionado." onClose={onClose} busy={save.isPending}><form onSubmit={submit} className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Código" error={form.formState.errors.codigo?.message}><input autoFocus className={inputClass} {...form.register('codigo')} /></Field><Field label="Nome" error={form.formState.errors.nome?.message}><input className={inputClass} {...form.register('nome')} /></Field></div>
    <Field label="Andar"><input className={inputClass} {...form.register('andar')} /></Field>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Classificação de risco"><FormSelect control={form.control} name="classificacaoRisco" options={[{ value: 'CRITICO', label: 'Crítico' }, { value: 'SEMI_CRITICO', label: 'Semicrítico' }, { value: 'NAO_CRITICO', label: 'Não crítico' }]} /></Field><Field label="Grupo de instalação"><FormSelect control={form.control} name="grupoInstalacao" options={[{ value: 'GRUPO_0', label: 'Grupo 0' }, { value: 'GRUPO_1', label: 'Grupo 1' }, { value: 'GRUPO_2', label: 'Grupo 2' }]} /></Field></div>
    {detail.isError && <p role="alert" className="text-xs text-danger">Não foi possível obter os dados atualizados do setor.</p>}<div className="flex justify-end gap-2 border-t border-border pt-4"><button type="button" disabled={save.isPending} onClick={onClose} className="h-9 rounded-md border border-border px-3 text-xs">Cancelar</button><button type="submit" disabled={save.isPending || detail.isLoading || detail.isError} className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand disabled:opacity-50">{save.isPending ? 'Salvando…' : 'Salvar setor'}</button></div>
  </form></Modal>
}
