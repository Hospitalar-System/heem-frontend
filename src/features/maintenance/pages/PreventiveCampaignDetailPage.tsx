import { ArrowLeft, Ban } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { Modal } from '@/components/ui/Modal'
import { useHospitals } from '@/features/assets/api/assets'
import { isCampaignRunning, useCampaign, useCancelCampaign } from '../api/preventive-campaigns'
import { CampaignStatusBadge, Metric, PendingBreakdown } from '../components/CampaignParts'
import type { CampaignPendingReason } from '../types/campaigns'
import { formatPlanDate } from '../utils/preventive-plans'
import { assignmentModeLabels, campaignApiError, recurrenceLabel } from '../utils/preventive-campaigns'

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'

export function PreventiveCampaignDetailPage() {
  const { id = '' } = useParams()
  const campaign = useCampaign(id)
  const hospitals = useHospitals()
  const cancel = useCancelCampaign()
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const data = campaign.data
  const pendingCounts = useMemo(() => {
    const counts: Partial<Record<CampaignPendingReason, number>> = {}
    for (const item of data?.pendenciasDetalhe ?? []) counts[item.motivo] = (counts[item.motivo] ?? 0) + 1
    return counts
  }, [data?.pendenciasDetalhe])
  const error = campaign.isError ? campaignApiError(campaign.error, 'Não foi possível carregar a campanha.') : undefined
  const running = isCampaignRunning(data)
  const pollStopped = campaign.pollStopped

  async function doCancel() {
    setCancelError('')
    try {
      await cancel.mutateAsync(id)
      toast.success('Campanha cancelada. As OTs já geradas foram mantidas.')
      setConfirmCancel(false)
    } catch (err) {
      setCancelError(campaignApiError(err, 'Não foi possível cancelar a campanha.').message)
    }
  }

  const processed = data?.execucao.processadas ?? 0
  const totalEquipment = data?.execucao.totalEquipamentos ?? 0
  const percent = totalEquipment > 0 ? Math.min(100, Math.round((processed / totalEquipment) * 100)) : (data?.status === 'concluida' ? 100 : 0)
  // Se a lista de pendências veio limitada, o total vem do contador da execução.
  const pendingTotal = Math.max(data?.execucao.pendencias ?? 0, data?.pendenciasDetalhe.length ?? 0)

  return <AdminPageShell title={data?.nome ?? 'Campanha de preventiva'} subtitle="Progresso da geração de OTs e situação das ordens criadas">
    <div className="space-y-4">
      <Link to="/preventive-campaigns" className={`inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-primary hover:underline ${focusRing}`}><ArrowLeft aria-hidden="true" size={14} />Voltar às campanhas</Link>

      {campaign.isLoading && <div aria-label="Carregando campanha" aria-busy="true" className="space-y-3 rounded-lg border border-border bg-surface p-4"><span className="sr-only">Carregando campanha.</span><div className="h-6 w-1/3 animate-pulse rounded-md bg-bg" />{Array.from({ length: 3 }, (_, index) => <div key={index} className="h-16 animate-pulse rounded-md bg-bg" />)}</div>}

      {error && <section role="alert" className="rounded-lg border border-border bg-surface p-8 text-center">
        <p className="text-sm text-text-primary">{error.message}</p>
        {error.status !== 403 && error.status !== 404 && <button type="button" onClick={() => void campaign.refetch()} className={`mt-3 rounded-md px-3 py-2 text-xs font-medium text-primary hover:bg-bg ${focusRing}`}>Tentar novamente</button>}
      </section>}

      {data && <>
        <section className="rounded-lg border border-border bg-surface p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold text-text-primary">{data.nome}</h2><CampaignStatusBadge status={data.status} /></div>
              <p className="mt-1 text-xs text-text-secondary">{hospitals.data?.find((item) => item.id === data.hospitalId)?.nome ?? '—'} · {recurrenceLabel(data.recorrencia, data.intervalo)} · {assignmentModeLabels[data.modoAtribuicao]}</p>
              <p className="mt-0.5 text-xs text-text-secondary">Início {formatPlanDate(data.dataInicio)}{data.dataFim ? ` · fim ${formatPlanDate(data.dataFim)}` : ''}{data.ativa && data.proximaData ? ` · próxima execução ${formatPlanDate(data.proximaData)}` : ''}</p>
            </div>
            {data.ativa && <button type="button" onClick={() => { setCancelError(''); setConfirmCancel(true) }} className={`inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-xs font-medium text-danger hover:bg-bg ${focusRing}`}><Ban aria-hidden="true" size={14} />Cancelar campanha</button>}
          </div>
        </section>

        <section aria-label="Progresso da geração" className="rounded-lg border border-border bg-surface p-4 md:p-5">
          <h2 className="text-sm font-semibold text-text-primary">Última execução</h2>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg" role="progressbar" aria-label="Progresso da geração de OTs" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} /></div>
          <p role="status" aria-live="polite" className="mt-2 text-xs text-text-secondary">
            {data.status === 'falhou' ? 'A geração falhou. Entre em contato com o suporte.' : data.status === 'cancelada' ? 'A campanha foi cancelada.' : running ? 'Gerando OTs… ' : 'Geração concluída. '}
            {processed} de {totalEquipment} equipamentos processados · {data.execucao.geradas} OTs geradas · {data.execucao.puladas} puladas · {data.execucao.pendencias} pendências
          </p>
          {pollStopped && <p className="mt-2 text-xs text-warning">A atualização automática foi pausada. <button type="button" onClick={() => void campaign.refetch()} className={`rounded font-medium text-primary underline ${focusRing}`}>Atualizar agora</button></p>}
        </section>

        <section aria-label="Situação das OTs" className="rounded-lg border border-border bg-surface p-4 md:p-5">
          <h2 className="text-sm font-semibold text-text-primary">Ordens de trabalho da campanha</h2>
          <dl className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-6">
            <Metric label="Total" value={data.ots.total} /><Metric label="Agendadas" value={data.ots.agendadas} /><Metric label="Em execução" value={data.ots.emExecucao} />
            <Metric label="Concluídas" value={data.ots.concluidas} /><Metric label="Canceladas" value={data.ots.canceladas} /><Metric label="Atrasadas" value={data.ots.atrasadas} tone={data.ots.atrasadas > 0 ? 'danger' : undefined} />
          </dl>
        </section>

        <section aria-label="Pendências da campanha" className="rounded-lg border border-border bg-surface p-4 md:p-5">
          <h2 className="mb-3 text-sm font-semibold text-text-primary">Pendências</h2>
          <PendingBreakdown counts={pendingCounts} items={data.pendenciasDetalhe} total={pendingTotal} />
        </section>
      </>}
    </div>

    {confirmCancel && data && <Modal title="Cancelar campanha" description="A recorrência e a geração em andamento são interrompidas." busy={cancel.isPending} onClose={() => setConfirmCancel(false)}>
      <div className="space-y-3">
        <p className="text-sm text-text-primary">Deseja cancelar a campanha <strong>{data.nome}</strong>?</p>
        <p className="text-xs text-text-secondary">Atenção: as OTs que já foram geradas <strong>não são canceladas</strong> e continuam na fila de trabalho. Cancele-as individualmente, se necessário.</p>
        {cancelError && <p role="alert" className="text-xs text-danger">{cancelError}</p>}
        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <button type="button" disabled={cancel.isPending} onClick={() => setConfirmCancel(false)} className={`h-9 rounded-md border border-border px-3 text-xs font-medium text-text-secondary hover:bg-bg ${focusRing} disabled:opacity-50`}>Voltar</button>
          <button type="button" disabled={cancel.isPending} onClick={() => void doCancel()} className="h-9 rounded-md bg-danger px-3 text-xs font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger disabled:cursor-not-allowed disabled:opacity-50">{cancel.isPending ? 'Cancelando…' : 'Cancelar campanha'}</button>
        </div>
      </div>
    </Modal>}
  </AdminPageShell>
}
