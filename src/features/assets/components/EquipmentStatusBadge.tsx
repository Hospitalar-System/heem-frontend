import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import type { EquipmentLifecycle } from '../types'

const labels: Record<EquipmentLifecycle, string> = {
  ATIVO: 'Ativo',
  EM_MANUTENCAO: 'Em manutenção',
  INATIVO: 'Inativo',
  DESATIVADO: 'Desativado',
  DESCARTADO: 'Descartado',
}

export function EquipmentStatusBadge({ status }: { status: EquipmentLifecycle }) {
  const tone: BadgeVariant = status === 'ATIVO' ? 'success' : status === 'EM_MANUTENCAO' ? 'warning' : 'neutral'

  return <Badge variant={tone}>{labels[status]}</Badge>
}
