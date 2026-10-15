import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/axios'
import type { CorrectiveWorkOrder, CorrectiveWorkOrderInput, Ticket } from '../types'

export const ticketsKey = ['tickets'] as const

export function useTickets() {
  return useQuery({
    queryKey: ticketsKey,
    queryFn: async () => (await apiClient.get<Ticket[]>('/chamados')).data,
  })
}

export function useCreateCorrectiveWorkOrder() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (input: CorrectiveWorkOrderInput) =>
      (await apiClient.post<CorrectiveWorkOrder>('/ordens-de-trabalho/corretivas', input)).data,
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ticketsKey }),
        client.invalidateQueries({ queryKey: ['work-orders'] }),
      ])
    },
  })
}
