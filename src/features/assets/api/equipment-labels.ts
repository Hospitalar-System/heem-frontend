import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/axios'
import type { CreateEquipmentLabelInput, EquipmentLabel } from '../types'

const equipmentLabelsKey = (equipmentId: string) => ['equipment-labels', equipmentId] as const

export function useEquipmentLabels(equipmentId: string) {
  return useQuery({
    queryKey: equipmentLabelsKey(equipmentId),
    queryFn: async () => (await apiClient.get<EquipmentLabel[]>(`/equipamentos/${equipmentId}/etiquetas`)).data,
    enabled: Boolean(equipmentId),
  })
}

export function useLinkEquipmentLabel(equipmentId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateEquipmentLabelInput) => {
      const response = await apiClient.post<EquipmentLabel>(`/equipamentos/${equipmentId}/etiquetas`, input)
      return { label: response.data, status: response.status }
    },
    onSuccess: async () => invalidateEquipmentLabelData(client, equipmentId),
  })
}

export function useUnlinkEquipmentLabel(equipmentId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (labelId: string) => apiClient.delete(`/equipamentos/${equipmentId}/etiquetas/${labelId}`),
    onSuccess: async () => invalidateEquipmentLabelData(client, equipmentId),
  })
}

async function invalidateEquipmentLabelData(client: ReturnType<typeof useQueryClient>, equipmentId: string) {
  await Promise.all([
    client.invalidateQueries({ queryKey: equipmentLabelsKey(equipmentId) }),
    client.invalidateQueries({ queryKey: ['equipment', equipmentId] }),
    client.invalidateQueries({ queryKey: ['equipments'] }),
    client.invalidateQueries({ queryKey: ['hospital-metrics'] }),
  ])
}
