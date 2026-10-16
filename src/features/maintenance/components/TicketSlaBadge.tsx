import type { TicketSlaStatus } from '../types'

const labels: Record<Exclude<TicketSlaStatus, null>, string> = {
  no_prazo: 'SLA no prazo',
  em_risco: 'SLA em risco',
  vencido: 'SLA vencido',
}

const tones: Record<Exclude<TicketSlaStatus, null>, string> = {
  no_prazo: 'border-primary/30 bg-primary/10 text-primary',
  em_risco: 'border-warning/30 bg-warning/10 text-warning',
  vencido: 'border-danger/30 bg-danger/10 text-danger',
}

export function TicketSlaBadge({ status }: { status?: TicketSlaStatus }) {
  if (!status) return null
  return <span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-medium ${tones[status]}`}>{labels[status]}</span>
}
