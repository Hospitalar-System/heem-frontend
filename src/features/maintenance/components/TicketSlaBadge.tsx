import { StatusBadge } from '@/components/ui/StatusBadge'
import { slaTones } from '@/lib/status-tones'
import type { TicketSlaStatus } from '../types'

const labels: Record<Exclude<TicketSlaStatus, null>, string> = {
  no_prazo: 'SLA no prazo',
  em_risco: 'SLA em risco',
  vencido: 'SLA vencido',
}


export function TicketSlaBadge({ status }: { status?: TicketSlaStatus }) {
  if (!status) return null
  return <StatusBadge tone={slaTones[status].tone} outline={slaTones[status].outline}>{labels[status]}</StatusBadge>
}
