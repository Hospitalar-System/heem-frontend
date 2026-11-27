import { Repeat } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { EquipmentRecurrence } from '../types'

/**
 * Story 23.8: selo de reincidência (N ou mais chamados de falha, ou sem tipo, nos últimos D dias, pela regra do cliente).
 * O texto fala só em contagem, nunca em causa ou previsão.
 */
export function RecurrenceBadge({ recurrence, className = '' }: { recurrence: EquipmentRecurrence | null | undefined; className?: string }) {
  if (!recurrence) return null
  const detail = `${recurrence.chamados} chamados de falha nos últimos ${recurrence.dias} dias`
  return <span title={detail} className={`inline-flex ${className}`}>
    <Badge variant="danger" outline className="gap-1"><Repeat aria-hidden size={12} strokeWidth={2.25} />Reincidente<span className="sr-only">: {detail}</span></Badge>
  </span>
}
