import { Building2, Pencil, Rows3 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { PageAction } from '@/components/ui/PageAction'
import { RowActionsMenu } from '@/components/ui/RowActionsMenu'
import type { Hospital } from '../types'
import { useHospitals } from '../api/assets'
import { useHospitalMetrics } from '../api/hospital-metrics'
import { HospitalForm, formatCnpj } from '../components/HospitalForm'

export function HospitalsPage() {
  const navigate = useNavigate()
  const { data = [], isLoading, isError, refetch } = useHospitals()
  const metrics = useHospitalMetrics(data)
  const [editing, setEditing] = useState<Hospital | null>(null)
  const [creating, setCreating] = useState(false)
  const startCreate = () => setCreating(true)
  const detailPath = (hospital: Hospital, tab?: string) => `/hospitals/${encodeURIComponent(hospital.id)}${tab ? `?aba=${tab}` : ''}`
  const metricValue = (value: number | null | undefined) => (metrics.isLoading ? '—' : value ?? '—')

  return <AdminPageShell title="Hospitais" subtitle="Hospitais do tenant" action={<PageAction onClick={startCreate} collapseLabelOnMobile>Novo hospital</PageAction>}>
    {isLoading ? <div aria-label="Carregando hospitais" aria-busy="true" className="space-y-2 rounded-lg border border-border bg-surface p-4">{[1, 2, 3].map((n) => <div key={n} className="h-10 animate-pulse rounded bg-bg" />)}</div> : null}
    {isError ? <section role="alert" className="rounded-lg border border-border bg-surface p-6"><p>Não foi possível carregar os hospitais.</p><button type="button" className="mt-3 text-sm text-primary underline" onClick={() => void refetch()}>Tentar novamente</button></section> : null}
    {!isLoading && !isError && data.length === 0 ? <section className="grid min-h-64 place-items-center rounded-lg border border-dashed border-border bg-surface p-8 text-center"><div><Building2 className="mx-auto text-text-muted" /><h2 className="mt-3 font-semibold">Nenhum hospital cadastrado</h2><p className="mt-1 text-sm text-text-secondary">Cadastre um hospital para organizar seus setores.</p><div className="mt-4 flex justify-center"><PageAction onClick={startCreate} fullWidthMobile>Cadastrar hospital</PageAction></div></div></section> : null}
    {!isLoading && !isError && data.length > 0 ? <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[760px] border-collapse text-left">
        <thead><tr className="table-head h-12 text-[11px]">{['Hospital', 'CNPJ', 'Setores', 'Equipamentos', 'OT devidas', ''].map((heading, index) => <th key={`${heading}${index}`} scope="col" className="px-4">{heading || <span className="sr-only">Ações</span>}</th>)}</tr></thead>
        <tbody>{data.map((hospital) => {
          const item = metrics.data?.[hospital.id]
          return <tr key={hospital.id} onClick={() => navigate(detailPath(hospital))} className="h-12 row-clickable border-b border-border/70 text-xs last:border-0">
            <td className="max-w-[320px] px-4 text-sm font-medium"><Link to={detailPath(hospital)} onClick={(event) => event.stopPropagation()} className="block truncate rounded outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-primary">{hospital.nome}</Link></td>
            <td className="px-4 text-text-secondary">{formatCnpj(hospital.cnpj) || '—'}</td>
            <td className="px-4 tabular-nums">{metricValue(item?.setores)}</td>
            <td className="px-4 tabular-nums">{metricValue(item?.equipamentos)}</td>
            <td className={`px-4 tabular-nums ${(item?.ordensDevidas ?? 0) > 0 ? 'font-semibold text-warning' : ''}`}>{metricValue(item?.ordensDevidas)}</td>
            <td className="px-4" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}><div className="flex justify-end"><RowActionsMenu label={hospital.nome} actions={[{ label: 'Editar hospital', icon: <Pencil size={14} />, onSelect: () => setEditing(hospital) }, { label: 'Ver setores', icon: <Rows3 size={14} />, to: detailPath(hospital, 'setores') }]} /></div></td>
          </tr>
        })}</tbody>
      </table>
    </div> : null}
    {data.length > 0 && metrics.isError && <p role="alert" className="mt-3 flex items-center justify-between gap-3 text-xs text-text-muted"><span>Não foi possível carregar algumas contagens dos hospitais.</span><button type="button" onClick={() => void metrics.refetch()} className="shrink-0 text-primary underline">Tentar novamente</button></p>}
    {data.length > 0 && metrics.data && Object.values(metrics.data).some((item) => item.ordensDevidas === null) && <p className="mt-3 text-[11px] text-text-muted">A contagem de OTs não está disponível para o perfil atual.</p>}
    {creating && <HospitalForm onClose={() => setCreating(false)} onSaved={() => setCreating(false)} />}
    {editing && <HospitalForm hospital={editing} onClose={() => setEditing(null)} onSaved={() => setEditing(null)} />}
  </AdminPageShell>
}
