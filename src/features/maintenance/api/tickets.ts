import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/axios'
import type { CorrectiveWorkOrder, CorrectiveWorkOrderInput, Ticket, TicketHistoryEvent } from '../types'

export const ticketsKey = ['tickets'] as const

export function useTickets() {
  return useQuery({
    queryKey: ticketsKey,
    queryFn: async () => (await apiClient.get<Ticket[]>('/chamados')).data,
  })
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: [...ticketsKey, id],
    queryFn: async () => (await apiClient.get<Ticket>(`/chamados/${id}`)).data,
    enabled: Boolean(id),
  })
}

export function useTicketHistory(id: string, enabled: boolean) {
  return useQuery({
    queryKey: [...ticketsKey, id, 'history'],
    queryFn: async () => (await apiClient.get<TicketHistoryEvent[]>(`/chamados/${id}/historico`)).data,
    enabled: Boolean(id) && enabled,
  })
}

export function useCreateCorrectiveWorkOrder() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (input: CorrectiveWorkOrderInput) =>
      (await apiClient.post<CorrectiveWorkOrder>('/ordens-de-trabalho/corretivas', input)).data,
    onSuccess: async (_data, input) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ticketsKey }),
        client.invalidateQueries({ queryKey: [...ticketsKey, input.chamadoId] }),
        client.invalidateQueries({ queryKey: ['work-orders'] }),
      ])
    },
  })
}
