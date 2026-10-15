import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/axios'
import type { ChecklistSummary, PreventiveWorkOrderInput, WorkOrderListItem } from '../types'

export const workOrdersKey = ['work-orders'] as const

export function useWorkOrders(atrasadas = false) {
  return useQuery({
    queryKey: [...workOrdersKey, { atrasadas }],
    queryFn: async () => (await apiClient.get<WorkOrderListItem[]>('/ordens-de-trabalho', {
      params: atrasadas ? { atrasadas: true } : undefined,
    })).data,
  })
}

export function useChecklists() {
  return useQuery({
    queryKey: ['checklists'],
    queryFn: async () => (await apiClient.get<ChecklistSummary[]>('/checklists')).data,
  })
}

export function useCreatePreventiveWorkOrder() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (input: PreventiveWorkOrderInput) =>
      (await apiClient.post<WorkOrderListItem>('/ordens-de-trabalho/preventivas', input)).data,
    onSuccess: () => client.invalidateQueries({ queryKey: workOrdersKey }),
  })
}
