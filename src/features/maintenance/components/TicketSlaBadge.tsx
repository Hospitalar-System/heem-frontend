import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import type { TicketSlaStatus } from '../types'

const labels: Record<Exclude<TicketSlaStatus, null>, string> = {
  no_prazo: 'SLA no prazo',
  em_risco: 'SLA em risco',
  vencido: 'SLA vencido',
}

const tones: Record<Exclude<TicketSlaStatus, null>, BadgeVariant> = {
  no_prazo: 'success',
  em_risco: 'warning',
  vencido: 'danger',
}

export function TicketSlaBadge({ status }: { status?: TicketSlaStatus }) {
  if (!status) return null
  return <Badge variant={tones[status]}>{labels[status]}</Badge>
}
