import { Building2, Pencil, Rows3 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { PageAction } from '@/components/ui/PageAction'
import { DataTable, type DataColumn } from '@/components/ui/DataTable'
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

  const columns: DataColumn<Hospital>[] = [
    { key: 'nome', header: 'Hospital', className: 'max-w-[320px]', cell: (hospital) => <Link to={detailPath(hospital)} className="block truncate rounded text-sm font-medium text-text-primary outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-primary">{hospital.nome}</Link> },
    { key: 'cnpj', header: 'CNPJ', cell: (hospital) => <span className="text-text-secondary">{formatCnpj(hospital.cnpj) || '—'}</span> },
    { key: 'setores', header: 'Setores', cell: (hospital) => <span className="tabular-nums">{metricValue(metrics.data?.[hospital.id]?.setores)}</span> },
    { key: 'equipamentos', header: 'Equipamentos', cell: (hospital) => <span className="tabular-nums">{metricValue(metrics.data?.[hospital.id]?.equipamentos)}</span> },
    { key: 'ordens', header: 'OT devidas', cell: (hospital) => { const value = metrics.data?.[hospital.id]?.ordensDevidas; return <span className={`tabular-nums ${(value ?? 0) > 0 ? 'font-semibold text-warning' : ''}`}>{metricValue(value)}</span> } },
  ]

  return <AdminPageShell title="Hospitais" subtitle="Hospitais do tenant" action={<PageAction onClick={startCreate} collapseLabelOnMobile>Novo hospital</PageAction>}>
    <DataTable
      label="Hospitais"
      columns={columns}
      rows={data}
      getRowId={(hospital) => hospital.id}
      rowLabel={(hospital) => hospital.nome}
      onRowClick={(hospital) => navigate(detailPath(hospital))}
      rowActions={(hospital) => [{ label: 'Editar hospital', icon: <Pencil size={14} />, onSelect: () => setEditing(hospital) }, { label: 'Ver setores', icon: <Rows3 size={14} />, to: detailPath(hospital, 'setores') }]}
      isLoading={isLoading}
      loadingLabel="Carregando hospitais"
      minWidth="760px"
      error={isError ? { message: 'Não foi possível carregar os hospitais.', onRetry: () => void refetch() } : null}
      empty={{ icon: <Building2 />, title: 'Nenhum hospital cadastrado', description: 'Cadastre um hospital para organizar seus setores.', action: <PageAction onClick={startCreate} fullWidthMobile>Cadastrar hospital</PageAction> }}
    />
    {data.length > 0 && metrics.isError && <p role="alert" className="mt-3 flex items-center justify-between gap-3 text-xs text-text-muted"><span>Não foi possível carregar algumas contagens dos hospitais.</span><button type="button" onClick={() => void metrics.refetch()} className="shrink-0 text-primary underline">Tentar novamente</button></p>}
    {data.length > 0 && metrics.data && Object.values(metrics.data).some((item) => item.ordensDevidas === null) && <p className="mt-3 text-[11px] text-text-muted">A contagem de OTs não está disponível para o perfil atual.</p>}
    {creating && <HospitalForm onClose={() => setCreating(false)} onSaved={() => setCreating(false)} />}
    {editing && <HospitalForm hospital={editing} onClose={() => setEditing(null)} onSaved={() => setEditing(null)} />}
  </AdminPageShell>
}
