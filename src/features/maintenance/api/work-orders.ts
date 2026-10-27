import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/axios'
import { usePagedQuery } from '@/lib/pagination'
import type { ChecklistItem, ChecklistSummary, CreateChecklistInput, PreventiveWorkOrderInput, SaveChecklistItemInput, WorkOrderChecklistItem, WorkOrderDetail, WorkOrderListItem } from '../types'

export const workOrdersKey = ['work-orders'] as const
const workOrderDetailKey = (id: string) => [...workOrdersKey, 'detail', id] as const

export interface WorkOrderListFilters {
  status?: string
  tipo?: string
  atrasadas?: boolean
  hospitalId?: string
  setorId?: string
  planoPreventivoId?: string
  campanhaPreventivaId?: string
  pagina: number
  tamanho: number
}

/** OTs paginadas no servidor (`pagina` 0-based, total em X-Total-Count); status, tipo e atrasadas filtram no servidor. */
export function useWorkOrdersPage({ atrasadas, ...filters }: WorkOrderListFilters) {
  return usePagedQuery<WorkOrderListItem>([...workOrdersKey, 'list'], '/ordens-de-trabalho', { ...filters, atrasadas: atrasadas || undefined })
}

export function useChecklists() {
  return useQuery({
    queryKey: ['checklists'],
    queryFn: async () => (await apiClient.get<ChecklistSummary[]>('/checklists')).data,
  })
}

export function useChecklistItems(id: string | undefined) {
  return useQuery({
    queryKey: ['checklists', id, 'items'],
    queryFn: async () => (await apiClient.get<ChecklistItem[]>(`/checklists/${id}/itens`)).data,
    enabled: Boolean(id),
  })
}

export function useCreateChecklist() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateChecklistInput) =>
      (await apiClient.post<ChecklistSummary>('/checklists', input)).data,
    onSuccess: () => client.invalidateQueries({ queryKey: ['checklists'] }),
  })
}

export function useAddChecklistItem(checklistId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (input: SaveChecklistItemInput) =>
      (await apiClient.post<ChecklistItem>(`/checklists/${checklistId}/itens`, input)).data,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['checklists', checklistId, 'items'] })
      client.invalidateQueries({ queryKey: ['checklists'] })
    },
  })
}

export function useUpdateChecklistItem(checklistId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: SaveChecklistItemInput & { id: string }) =>
      (await apiClient.put<ChecklistItem>(`/checklists/itens/${id}`, input)).data,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['checklists', checklistId, 'items'] })
      client.invalidateQueries({ queryKey: ['checklists'] })
    },
  })
}

export function useReorderChecklistItems(checklistId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) =>
      (await apiClient.put(`/checklists/${checklistId}/itens/ordem`, {
        itens: ids.map((id, ordem) => ({ id, ordem })),
      })).data,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['checklists', checklistId, 'items'] })
      client.invalidateQueries({ queryKey: ['checklists'] })
    },
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
