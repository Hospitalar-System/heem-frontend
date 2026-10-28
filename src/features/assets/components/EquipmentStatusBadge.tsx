import { StatusBadge, type StatusTone } from '@/components/ui/StatusBadge'
import type { EquipmentLifecycle } from '../types'

const labels: Record<EquipmentLifecycle, string> = {
  ATIVO: 'Ativo',
  EM_MANUTENCAO: 'Em manutenção',
  INATIVO: 'Inativo',
  DESATIVADO: 'Desativado',
  DESCARTADO: 'Descartado',
}

export function EquipmentStatusBadge({ status }: { status: EquipmentLifecycle }) {
  const tone: StatusTone = status === 'ATIVO' ? 'success' : status === 'EM_MANUTENCAO' ? 'warning' : 'neutral'

  return <StatusBadge tone={tone}>{labels[status]}</StatusBadge>
}
