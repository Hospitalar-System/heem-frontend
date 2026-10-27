import { StatusBadge, type StatusTone } from '@/components/ui/StatusBadge'
import type { TicketSlaStatus } from '../types'

const labels: Record<Exclude<TicketSlaStatus, null>, string> = {
  no_prazo: 'SLA no prazo',
  em_risco: 'SLA em risco',
  vencido: 'SLA vencido',
}

const tones: Record<Exclude<TicketSlaStatus, null>, StatusTone> = {
  no_prazo: 'success',
  em_risco: 'warning',
  vencido: 'danger',
}

export function TicketSlaBadge({ status }: { status?: TicketSlaStatus }) {
  if (!status) return null
  return <StatusBadge tone={tones[status]}>{labels[status]}</StatusBadge>
}
