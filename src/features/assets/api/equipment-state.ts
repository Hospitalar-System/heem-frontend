import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/axios'
import { usePagedQuery } from '@/lib/pagination'
import type { ChangeEquipmentStateInput, Equipment, EquipmentStateHistoryEntry } from '../types'

/** Histórico de estado do equipamento (mais recente primeiro), paginado no servidor (`pagina` 0-based, total em X-Total-Count). */
export function useEquipmentStateHistory(equipmentId: string, page: { pagina: number; tamanho: number }) {
  return usePagedQuery<EquipmentStateHistoryEntry>(['equipment-state-history', equipmentId], `/equipamentos/${equipmentId}/historico-estado`, { ...page }, Boolean(equipmentId))
}

/** PATCH /equipamentos/{id}/estado; invalida ficha, lista e histórico. */
export function useChangeEquipmentState(equipmentId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (input: ChangeEquipmentStateInput) => (await apiClient.patch<Equipment>(`/equipamentos/${equipmentId}/estado`, input)).data,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['equipment', equipmentId] })
      void client.invalidateQueries({ queryKey: ['equipments'] })
      void client.invalidateQueries({ queryKey: ['equipment-state-history', equipmentId] })
    },
  })
}
