import { CalendarCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { Select } from '@/components/ui/Select'
import { PageAction } from '@/components/ui/PageAction'
import { FilterBar } from '@/components/ui/FilterBar'
import { useHospitals } from '@/features/assets/api/assets'
import { useCampaigns } from '../api/preventive-campaigns'
import { CampaignStatusBadge } from '../components/CampaignParts'
import type { CampaignStatus } from '../types/campaigns'
import { formatPlanDate } from '../utils/preventive-plans'
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

  return <AdminPageShell title="Campanha de preventiva" subtitle="Gere as OTs preventivas do parque de um hospital de uma só vez" action={<PageAction to="/preventive-campaigns/new" collapseLabelOnMobile>Nova campanha</PageAction>}>
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

      {campaigns.isLoading && <div aria-label="Carregando campanhas" aria-busy="true" className="overflow-hidden rounded-lg border border-border bg-surface p-4"><span className="sr-only">Carregando campanhas.</span><div className="mb-3 h-9 animate-pulse rounded-md bg-bg" />{Array.from({ length: 4 }, (_, index) => <div key={index} className="my-2 h-12 animate-pulse rounded-md bg-bg" />)}</div>}

      {campaigns.isError && <section role="alert" className="rounded-lg border border-border bg-surface p-8 text-center">
        <p className="text-sm text-text-primary">{forbidden ? 'Acesso não permitido. Apenas o administrador do cliente gerencia campanhas de preventiva.' : campaignApiError(campaigns.error, 'Não foi possível carregar as campanhas.').message}</p>
        {!forbidden && <button type="button" onClick={() => void campaigns.refetch()} className={`mt-3 rounded-md px-3 py-2 text-xs font-medium text-primary hover:bg-bg ${linkClass}`}>Tentar novamente</button>}
      </section>}

      {campaigns.data && campaigns.data.length === 0 && <section className="grid min-h-56 place-items-center rounded-lg border border-dashed border-border bg-surface p-8 text-center">
        <div className="max-w-md">
          <span className="mx-auto grid size-10 place-items-center rounded-md bg-bg text-text-secondary"><CalendarCheck aria-hidden="true" size={18} /></span>
          <h2 className="mt-3 text-sm font-semibold text-text-primary">{filtersActive ? 'Nenhuma campanha encontrada' : 'Nenhuma campanha criada'}</h2>
          <p className="mt-1 text-xs leading-5 text-text-secondary">{filtersActive ? 'Ajuste os filtros para consultar outras campanhas.' : 'Crie uma campanha para gerar as OTs preventivas do parque de um hospital.'}</p>
          {filtersActive
            ? <button type="button" onClick={() => { setHospitalId(''); setStatus('') }} className={`mt-3 rounded-md px-3 py-2 text-xs font-medium text-primary hover:bg-bg ${linkClass}`}>Limpar filtros</button>
            : <div className="mt-3 flex justify-center"><PageAction to="/preventive-campaigns/new" fullWidthMobile>Criar primeira campanha</PageAction></div>}
        </div>
      </section>}

      {campaigns.data && campaigns.data.length > 0 && <section aria-label="Lista de campanhas" className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead><tr className="table-head h-10 text-[10px] uppercase"><th scope="col" className="px-4">Campanha</th><th scope="col" className="px-4">Hospital</th><th scope="col" className="px-4">Status</th><th scope="col" className="px-4">Recorrência</th><th scope="col" className="px-4">Próxima data</th><th scope="col" className="px-4">Última execução</th></tr></thead>
          <tbody>{campaigns.data.map((campaign) => <tr key={campaign.id} className="h-14 border-b border-border/70 text-xs last:border-0">
            <td className="px-4"><Link to={`/preventive-campaigns/${campaign.id}`} className={`font-medium text-primary hover:underline ${linkClass}`}>{campaign.nome}</Link><span className="block text-[10px] text-text-muted">Início {formatPlanDate(campaign.dataInicio)}</span></td>
            <td className="px-4 text-text-secondary">{hospitalById.get(campaign.hospitalId) ?? '—'}</td>
            <td className="px-4"><CampaignStatusBadge status={campaign.status} /></td>
            <td className="px-4 text-text-secondary">{recurrenceLabel(campaign.recorrencia, campaign.intervalo)}</td>
            <td className="px-4 text-text-secondary">{campaign.ativa ? formatPlanDate(campaign.proximaData) : '—'}</td>
            <td className="px-4 text-text-secondary">{campaign.execucao.geradas} geradas · {campaign.execucao.puladas} puladas · {campaign.execucao.pendencias} pendências<span className="block text-[10px] text-text-muted">{campaign.execucao.processadas} de {campaign.execucao.totalEquipamentos} equipamentos</span></td>
          </tr>)}</tbody>
        </table>
      </section>}
    </div>
  </AdminPageShell>
}
