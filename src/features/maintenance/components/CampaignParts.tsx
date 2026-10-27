import { AlertTriangle } from 'lucide-react'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import type { CampaignPendingItem, CampaignPendingReason, CampaignStatus } from '../types/campaigns'
import { campaignStatusLabels, pendingReasonInfo, pendingReasons } from '../utils/preventive-campaigns'

const statusTone: Record<CampaignStatus, BadgeVariant> = {
  pendente: 'neutral',
  processando: 'warning',
  concluida: 'success',
  falhou: 'danger',
  cancelada: 'neutral',
}

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return <Badge variant={statusTone[status]}>{campaignStatusLabels[status]}</Badge>
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
