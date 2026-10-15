import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/axios'
import type { ChecklistSummary, PreventiveWorkOrderInput, WorkOrderChecklistItem, WorkOrderDetail, WorkOrderListItem } from '../types'

export const workOrdersKey = ['work-orders'] as const
const workOrderDetailKey = (id: string) => [...workOrdersKey, 'detail', id] as const

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

export function useWorkOrder(id: string) {
  return useQuery({
    queryKey: workOrderDetailKey(id),
    queryFn: async () => (await apiClient.get<WorkOrderDetail>(`/ordens-de-trabalho/${id}`)).data,
    enabled: Boolean(id),
  })
}

export function useWorkOrderChecklistItems(checklistId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: ['checklists', checklistId, 'items'],
    queryFn: async () => (await apiClient.get<WorkOrderChecklistItem[]>(`/checklists/${checklistId}/itens`)).data,
    enabled: Boolean(checklistId) && enabled,
  })
}

export function useReassignWorkOrderTechnician(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (tecnicoId: string) =>
      (await apiClient.put<WorkOrderDetail>(`/ordens-de-trabalho/${id}`, { tecnicoId })).data,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: workOrderDetailKey(id) })
      client.invalidateQueries({ queryKey: workOrdersKey })
    },
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
