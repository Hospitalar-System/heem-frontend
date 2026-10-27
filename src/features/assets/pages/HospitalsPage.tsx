import { Building2, House, MoreHorizontal, Pencil, Rows3 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { PageAction } from '@/components/ui/PageAction'
import { Field, Modal } from '@/components/ui/Modal'
import { hospitalSchema } from '../schemas/assets.schema'
import type { Hospital, HospitalInput } from '../types'
import { useHospital, useHospitals, useSaveHospital } from '../api/assets'
import { useHospitalMetrics } from '../api/hospital-metrics'

const inputClass = 'h-10 w-full rounded-md border border-border bg-bg px-3 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

export function HospitalsPage() {
  const navigate = useNavigate()
  const { data = [], isLoading, isError, refetch } = useHospitals()
  const metrics = useHospitalMetrics(data)
  const [editing, setEditing] = useState<Hospital | null>(null)
  const [creating, setCreating] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const startCreate = () => setCreating(true)
  const openEdit = (hospital: Hospital) => { setEditing(hospital); setEditOpen(true) }

  return <AdminPageShell title="Hospitais" subtitle="Hospitais do tenant" action={<PageAction onClick={startCreate} collapseLabelOnMobile>Novo hospital</PageAction>}>
    {isLoading ? <div aria-label="Carregando hospitais" aria-busy="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((n) => <div key={n} className="h-44 animate-pulse rounded-lg border border-border bg-surface" />)}</div> : null}
    {isError ? <section role="alert" className="rounded-lg border border-border bg-surface p-6"><p>Não foi possível carregar os hospitais.</p><button type="button" className="mt-3 text-sm text-primary underline" onClick={() => void refetch()}>Tentar novamente</button></section> : null}
    {!isLoading && !isError && data.length === 0 ? <section className="grid min-h-64 place-items-center rounded-lg border border-dashed border-border bg-surface p-8 text-center"><div><Building2 className="mx-auto text-text-muted" /><h2 className="mt-3 font-semibold">Nenhum hospital cadastrado</h2><p className="mt-1 text-sm text-text-secondary">Cadastre um hospital para organizar seus setores.</p><div className="mt-4 flex justify-center"><PageAction onClick={startCreate} fullWidthMobile>Cadastrar hospital</PageAction></div></div></section> : null}
    {!isLoading && !isError && data.length > 0 ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{data.map((hospital) => <article key={hospital.id} className="min-h-[219px] rounded-lg border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={() => navigate(`/sectors?hospitalId=${encodeURIComponent(hospital.id)}`)} className="grid size-10 place-items-center rounded-md bg-bg text-primary outline-none hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary" aria-label={`Abrir setores de ${hospital.nome}`}><House size={17} /></button>
        <details className="relative"><summary aria-label={`Ações de ${hospital.nome}`} className="grid size-8 cursor-pointer list-none place-items-center rounded-md text-text-muted hover:bg-bg hover:text-text-primary"><MoreHorizontal size={16} /></summary><div className="absolute right-0 top-9 z-10 w-40 rounded-md border border-border bg-surface p-1 shadow-xl"><button type="button" onClick={() => openEdit(hospital)} className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs hover:bg-bg"><Pencil size={13} /> Editar hospital</button><button type="button" onClick={() => navigate(`/sectors?hospitalId=${encodeURIComponent(hospital.id)}`)} className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs hover:bg-bg"><Rows3 size={13} /> Ver setores</button></div></details>
      </div>
      <button type="button" onClick={() => navigate(`/sectors?hospitalId=${encodeURIComponent(hospital.id)}`)} className="mt-4 block max-w-full truncate text-left text-base font-semibold hover:text-primary">{hospital.nome}</button>
      <p className="mt-1 truncate text-xs text-text-muted">{formatCnpj(hospital.cnpj)}</p>
      <div className="mt-4 grid max-w-sm grid-cols-3 items-start justify-items-start gap-5 border-t border-border pt-3">
        <HospitalMetric label="setores" value={metrics.data?.[hospital.id]?.setores} loading={metrics.isLoading} />
        <HospitalMetric label="equipamentos" value={metrics.data?.[hospital.id]?.equipamentos} loading={metrics.isLoading} />
        <HospitalMetric label="OT devidas" value={metrics.data?.[hospital.id]?.ordensDevidas} loading={metrics.isLoading} warning={(metrics.data?.[hospital.id]?.ordensDevidas ?? 0) > 0} />
      </div>
    </article>)}</div> : null}
    {data.length > 0 && metrics.isError && <p role="alert" className="mt-3 flex items-center justify-between gap-3 text-xs text-text-muted"><span>Não foi possível carregar algumas contagens dos hospitais.</span><button type="button" onClick={() => void metrics.refetch()} className="shrink-0 text-primary underline">Tentar novamente</button></p>}
    {data.length > 0 && metrics.data && Object.values(metrics.data).some((item) => item.ordensDevidas === null) && <p className="mt-3 text-[11px] text-text-muted">A contagem de OTs não está disponível para o perfil atual.</p>}
    {creating && <HospitalForm onClose={() => setCreating(false)} onSaved={() => setCreating(false)} />}
    {editOpen && editing && <HospitalForm hospital={editing} onClose={() => setEditOpen(false)} onSaved={() => setEditOpen(false)} />}
  </AdminPageShell>
}

function HospitalMetric({ label, value, loading, warning = false }: { label: string; value: number | null | undefined; loading: boolean; warning?: boolean }) {
  return <div className="min-w-0"><p className={`text-[21px] font-bold leading-6 tabular-nums ${warning ? 'text-warning' : 'text-text-primary'}`}>{loading ? '—' : value ?? '—'}</p><p className="mt-0.5 whitespace-nowrap text-[11px] leading-4 text-text-muted">{label}</p></div>
}

function HospitalForm({ hospital, onClose, onSaved }: { hospital?: Hospital; onClose: () => void; onSaved: () => void }) {
  const detail = useHospital(hospital?.id ?? '')
  const save = useSaveHospital()
  const form = useForm<HospitalInput>({ resolver: zodResolver(hospitalSchema), values: hospital ? { nome: detail.data?.nome ?? hospital.nome, cnpj: detail.data?.cnpj ?? hospital.cnpj } : undefined })
  const submit = form.handleSubmit(async (data) => { try { await save.mutateAsync({ id: hospital?.id, data }); toast.success(hospital ? 'Hospital atualizado.' : 'Hospital cadastrado.'); onSaved() } catch { toast.error('Não foi possível salvar o hospital.') } })
  return <Modal title={hospital ? 'Editar hospital' : 'Novo hospital'} description={hospital ? undefined : 'Os dados serão associados ao tenant da sua sessão.'} onClose={onClose} busy={save.isPending}>
    <form onSubmit={submit} className="space-y-4"><Field label="Nome do hospital" error={form.formState.errors.nome?.message}><input autoFocus className={inputClass} {...form.register('nome')} /></Field><Field label="CNPJ" error={form.formState.errors.cnpj?.message}><input className={inputClass} inputMode="numeric" {...form.register('cnpj')} /></Field>{detail.isError && <p role="alert" className="text-xs text-danger">Não foi possível obter os dados atualizados do hospital.</p>}<div className="flex justify-end gap-2 border-t border-border pt-4"><button type="button" disabled={save.isPending} onClick={onClose} className="h-9 rounded-md border border-border px-3 text-xs">Cancelar</button><button type="submit" disabled={save.isPending || detail.isLoading || detail.isError} className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand disabled:opacity-50">{save.isPending ? 'Salvando…' : 'Salvar hospital'}</button></div></form>
  </Modal>
}

function formatCnpj(value: string) { const digits = value.replace(/\D/g, ''); return digits.length === 14 ? digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : value }
