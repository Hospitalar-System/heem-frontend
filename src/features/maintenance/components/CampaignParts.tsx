import { AlertTriangle } from 'lucide-react'
import { StatusBadge, type StatusTone } from '@/components/ui/StatusBadge'
import { DataTable, type DataColumn } from '@/components/ui/DataTable'
import type { Campaign, CampaignPendingItem, CampaignPendingReason, CampaignSkippedItem, CampaignStatus } from '../types/campaigns'
import { campaignStatusLabels, pendingReasonInfo, pendingReasons, skippedReasonLabel } from '../utils/preventive-campaigns'

const skippedColumns: DataColumn<CampaignSkippedItem>[] = [
  { key: 'codigo', header: 'Equipamento', cell: (item) => <span className="font-medium text-text-primary">{item.codigo}</span> },
  { key: 'motivo', header: 'Motivo', cell: (item) => skippedReasonLabel(item.motivo) },
  // O backend só devolve o código da OT (não o id), então não há link para a OT.
  { key: 'otCodigo', header: 'OT aberta', cell: (item) => item.otCodigo ?? '—' },
]

/**
 * Equipamentos pulados com o motivo. `total` é o contador (`puladas`); a lista pode vir truncada
 * (prévia 200, painel 1000), e então avisamos "Mostrando N de M".
 */
export function SkippedBreakdown({ items, total }: { items: CampaignSkippedItem[]; total: number }) {
  const count = Math.max(total, items.length)
  if (count === 0) return <p className="text-xs text-text-secondary">Nenhum equipamento foi pulado.</p>
  return <div className="space-y-2">
    {items.length > 0 && <DataTable label="Equipamentos pulados" columns={skippedColumns} rows={items} getRowId={(item) => item.equipamentoId} minWidth="480px" rowHeightClass="h-10" />}
    {items.length < count && <p className="text-[11px] text-text-muted">Mostrando {items.length} de {count} equipamentos pulados.</p>}
  </div>
}

const percentFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

/** Resumo do painel, o mesmo conjunto de números do relatório exportado. Geradas/concluídas somam todas as janelas; puladas e pendências são da última execução. */
export function CampaignSummary({ campaign, pendingCounts }: { campaign: Campaign; pendingCounts: Partial<Record<CampaignPendingReason, number>> }) {
  const { ots, execucao } = campaign
  const percent = ots.total > 0 ? `${percentFormat.format((ots.concluidas / ots.total) * 100)}%` : '—'
  const pendingByReason = pendingReasons.filter((reason) => (pendingCounts[reason] ?? 0) > 0)
  return <section aria-label="Resumo da campanha" className="rounded-lg border border-border bg-surface p-4 md:p-5">
    <h2 className="text-sm font-semibold text-text-primary">Resumo da campanha</h2>
    <dl className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-5">
      <Metric label="Previstas" value={execucao.totalEquipamentos} /><Metric label="Geradas" value={ots.total} /><Metric label="Concluídas" value={ots.concluidas} />
      <Metric label="Em andamento" value={ots.emExecucao} /><Metric label="Agendadas" value={ots.agendadas} /><Metric label="Canceladas" value={ots.canceladas} />
      <Metric label="Atrasadas" value={ots.atrasadas} tone={ots.atrasadas > 0 ? 'danger' : undefined} /><Metric label="Puladas" value={execucao.puladas} /><Metric label="Pendências" value={execucao.pendencias} />
      <Metric label="% de execução" value={percent} />
    </dl>
    {pendingByReason.length > 0 && <p className="mt-3 text-xs text-text-secondary">Pendências por motivo: {pendingByReason.map((reason) => `${pendingReasonInfo[reason].title} (${pendingCounts[reason]})`).join(' · ')}</p>}
  </section>
}

const statusTone: Record<CampaignStatus, StatusTone> = {
  pendente: 'neutral',
  processando: 'warning',
  concluida: 'success',
  falhou: 'danger',
  cancelada: 'neutral',
}

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return <StatusBadge tone={statusTone[status]}>{campaignStatusLabels[status]}</StatusBadge>
}

/**
 * Pendências agrupadas por motivo, com a orientação de como resolver e a lista de equipamentos.
 * `counts` vem da prévia; no painel é calculado a partir da lista (que o backend limita).
 */
export function PendingBreakdown({ counts, items, total }: { counts: Partial<Record<CampaignPendingReason, number>>; items: CampaignPendingItem[]; total: number }) {
  if (total === 0) return <p className="text-xs text-text-secondary">Nenhuma pendência: todos os equipamentos elegíveis geram OT.</p>
  const shown = items.length
  return <div className="space-y-3">
    {pendingReasons.filter((reason) => (counts[reason] ?? 0) > 0).map((reason) => {
      const list = items.filter((item) => item.motivo === reason)
      return <section key={reason} aria-label={`Pendências: ${pendingReasonInfo[reason].title}`} className="rounded-md border border-warning/30 bg-warning/5 p-3">
        <h4 className="flex items-center gap-2 text-xs font-semibold text-text-primary"><AlertTriangle aria-hidden="true" size={13} className="text-warning" />{pendingReasonInfo[reason].title} <span className="font-normal text-text-secondary">({counts[reason]})</span></h4>
        <p className="mt-1 text-xs text-text-secondary">{pendingReasonInfo[reason].help}</p>
        {list.length > 0 && <ul className="mt-2 flex flex-wrap gap-1.5">{list.map((item) => <li key={item.equipamentoId} className="rounded-md border border-border bg-surface px-2 py-0.5 text-[11px] text-text-primary">{item.codigo}</li>)}</ul>}
      </section>
    })}
    {shown < total && <p className="text-[11px] text-text-muted">Mostrando {shown} de {total} equipamentos pendentes.</p>}
  </div>
}

export function Metric({ label, value, tone }: { label: string; value: number | string; tone?: 'danger' }) {
  return <div className="rounded-md border border-border bg-bg p-3">
    <dt className="text-[11px] text-text-secondary">{label}</dt>
    <dd className={`mt-1 text-lg font-semibold ${tone === 'danger' ? 'text-danger' : 'text-text-primary'}`}>{value}</dd>
  </div>
}
