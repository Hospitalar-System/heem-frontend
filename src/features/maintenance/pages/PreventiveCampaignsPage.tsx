import { CalendarCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { WorkOrdersTabs } from '../components/WorkOrdersTabs'
import { Select } from '@/components/ui/Select'
import { PageAction } from '@/components/ui/PageAction'
import { FilterBar } from '@/components/ui/FilterBar'
import { useHospitals } from '@/features/assets/api/assets'
import { useCampaigns } from '../api/preventive-campaigns'
import { CampaignStatusBadge } from '../components/CampaignParts'
import type { Campaign, CampaignStatus } from '../types/campaigns'
import { formatPlanDate } from '../utils/preventive-plans'
import { DataTable, type DataColumn } from '@/components/ui/DataTable'
import { campaignApiError, campaignStatusLabels, recurrenceLabel } from '../utils/preventive-campaigns'

const statusOptions = [{ value: '', label: 'Todos os status' }, ...(Object.keys(campaignStatusLabels) as CampaignStatus[]).map((value) => ({ value, label: campaignStatusLabels[value] }))]
const linkClass = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'

export function PreventiveCampaignsPage() {
  const [hospitalId, setHospitalId] = useState('')
  const [status, setStatus] = useState('')
  const hospitals = useHospitals()
  const campaigns = useCampaigns({ hospitalId: hospitalId || undefined, status: (status || undefined) as CampaignStatus | undefined })
  const hospitalById = useMemo(() => new Map((hospitals.data ?? []).map((item) => [item.id, item.nome])), [hospitals.data])
  const filtersActive = Boolean(hospitalId || status)
  const forbidden = campaigns.isError && campaignApiError(campaigns.error, '').status === 403

  const campaignColumns: DataColumn<Campaign>[] = [
    { key: 'nome', header: 'Campanha', cell: (campaign) => <><Link to={`/work-orders/campanhas/${campaign.id}`} className={`font-medium text-primary hover:underline ${linkClass}`}>{campaign.nome}</Link><span className="block text-[10px] text-text-muted">Início {formatPlanDate(campaign.dataInicio)}</span></> },
    { key: 'hospital', header: 'Hospital', cell: (campaign) => <span className="text-text-secondary">{hospitalById.get(campaign.hospitalId) ?? '—'}</span> },
    { key: 'status', header: 'Status', cell: (campaign) => <CampaignStatusBadge status={campaign.status} /> },
    { key: 'recorrencia', header: 'Recorrência', cell: (campaign) => <span className="text-text-secondary">{recurrenceLabel(campaign.recorrencia, campaign.intervalo)}</span> },
    { key: 'proxima', header: 'Próxima data', cell: (campaign) => <span className="text-text-secondary">{campaign.ativa ? formatPlanDate(campaign.proximaData) : '—'}</span> },
    { key: 'execucao', header: 'Última execução', cell: (campaign) => <span className="text-text-secondary">{campaign.execucao.geradas} geradas · {campaign.execucao.puladas} puladas · {campaign.execucao.pendencias} pendências<span className="block text-[10px] text-text-muted">{campaign.execucao.processadas} de {campaign.execucao.totalEquipamentos} equipamentos</span></span> },
  ]
  return <AdminPageShell tabs={<WorkOrdersTabs />} title="Campanha de preventiva" subtitle="Gere as OTs preventivas do parque de um hospital de uma só vez" action={<PageAction to="/work-orders/campanhas/new" collapseLabelOnMobile>Nova campanha</PageAction>}>
    <div className="space-y-4">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4 md:p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><CalendarCheck aria-hidden="true" size={17} /></span>
          <div><h2 className="text-sm font-semibold text-text-primary">Campanhas do parque</h2><p className="mt-1 text-xs text-text-secondary">Escolha hospital, setores e categorias; confira a prévia e gere as OTs com atribuição automática.</p></div>
        </div>
      </section>

      <FilterBar label="Filtros de campanhas">
        <Select size="sm" aria-label="Filtrar por hospital" value={hospitalId} onChange={setHospitalId} options={[{ value: '', label: 'Todos os hospitais' }, ...(hospitals.data ?? []).map((item) => ({ value: item.id, label: item.nome }))]} />
        <Select size="sm" aria-label="Filtrar por status" value={status} onChange={setStatus} options={statusOptions} />
      </FilterBar>

      <DataTable
        label="Lista de campanhas"
        columns={campaignColumns}
        rows={campaigns.data ?? []}
        getRowId={(campaign) => campaign.id}
        minWidth="900px"
        rowHeightClass="h-14"
        isLoading={campaigns.isLoading}
        loadingLabel="Carregando campanhas"
        error={campaigns.isError ? { message: forbidden ? 'Acesso não permitido. Apenas o administrador do cliente gerencia campanhas de preventiva.' : campaignApiError(campaigns.error, 'Não foi possível carregar as campanhas.').message, onRetry: forbidden ? undefined : () => void campaigns.refetch() } : null}
        empty={campaigns.data ? {
          icon: <CalendarCheck size={22} />,
          title: filtersActive ? 'Nenhuma campanha encontrada' : 'Nenhuma campanha criada',
          description: filtersActive ? 'Ajuste os filtros para consultar outras campanhas.' : 'Crie uma campanha para gerar as OTs preventivas do parque de um hospital.',
          action: filtersActive
            ? <button type="button" onClick={() => { setHospitalId(''); setStatus('') }} className={`rounded-md px-3 py-2 text-xs font-medium text-primary hover:bg-bg ${linkClass}`}>Limpar filtros</button>
            : <PageAction to="/work-orders/campanhas/new" fullWidthMobile>Criar primeira campanha</PageAction>,
        } : undefined}
      />
    </div>
  </AdminPageShell>
}
