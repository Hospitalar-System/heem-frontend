import type { EquipmentLifecycle } from '../types'

const labels: Record<EquipmentLifecycle, string> = {
  ATIVO: 'Ativo',
  EM_MANUTENCAO: 'Em manutenção',
  INATIVO: 'Inativo',
  DESATIVADO: 'Desativado',
  DESCARTADO: 'Descartado',
}

export function EquipmentStatusBadge({ status }: { status: EquipmentLifecycle }) {
  const tone = status === 'ATIVO'
    ? 'bg-primary/10 text-primary'
    : status === 'EM_MANUTENCAO'
      ? 'bg-warning/10 text-warning'
      : 'bg-bg text-text-secondary'

  return <span className={`inline-flex min-h-6 items-center rounded-full px-2.5 text-[11px] font-medium ${tone}`}>{labels[status]}</span>
}
