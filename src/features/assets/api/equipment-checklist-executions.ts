import { usePagedQuery } from '@/lib/pagination'
import type { ChecklistExecution } from '../types'

/** Execuções de checklist (OTs concluídas) do equipamento, paginadas no servidor (`pagina` 0-based, total em X-Total-Count). */
export function useEquipmentChecklistExecutions(equipmentId: string, page: { pagina: number; tamanho: number }) {
  return usePagedQuery<ChecklistExecution>(['equipment-checklist-executions', equipmentId], `/equipamentos/${equipmentId}/execucoes-checklist`, { ...page }, Boolean(equipmentId))
}
