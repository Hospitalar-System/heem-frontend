import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/axios'
import { fetchPaged, usePagedQuery } from '@/lib/pagination'
import type { ChangeTicketStatusInput, CorrectiveWorkOrder, CorrectiveWorkOrderInput, Ticket, TicketHistoryEvent } from '../types'

export const ticketsKey = ['tickets'] as const

export interface TicketListFilters {
  status?: string
  pagina: number
  tamanho: number
}

/** Chamados paginados no servidor (`pagina` 0-based, total em X-Total-Count); status também filtra no servidor. */
export function useTicketsPage(filters: TicketListFilters) {
  return usePagedQuery<Ticket>([...ticketsKey, 'list'], '/chamados', { ...filters })
}

/** Quantos chamados críticos/altos aguardam atendimento, independente da página e do filtro da lista. */
export function useUrgentTicketCount() {
  return useQuery({
    queryKey: [...ticketsKey, 'urgent'],
    queryFn: async () => {
      const [open, waiting] = await Promise.all(['ABERTO', 'AGUARDANDO_PECA'].map((status) => fetchPaged<Ticket>('/chamados', { status, pagina: 0, tamanho: 200 })))
      const unique = new Map([...open.items, ...waiting.items].map((ticket) => [ticket.id, ticket]))
      return [...unique.values()].filter((ticket) =>
        (ticket.severidade === 'CRITICA' || ticket.severidade === 'ALTA')
        && ['ABERTO', 'AGUARDANDO_PECA'].includes(ticket.status.toLocaleUpperCase('pt-BR').replace('Ç', 'C'))).length
    },
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

function useInvalidateTicket() {
  const client = useQueryClient()
  return async (id: string) => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ticketsKey }),
      client.invalidateQueries({ queryKey: [...ticketsKey, id] }),
      client.invalidateQueries({ queryKey: [...ticketsKey, id, 'history'] }),
      client.invalidateQueries({ queryKey: ['work-orders'] }),
    ])
  }
}

export function useAssumeTicket() {
  const invalidate = useInvalidateTicket()
  return useMutation({
    mutationFn: async (id: string) => (await apiClient.put<Ticket>(`/chamados/${id}/assumir`)).data,
    onSuccess: (_data, id) => invalidate(id),
  })
}

export function useAssignTicketResponsible() {
  const invalidate = useInvalidateTicket()
  return useMutation({
    mutationFn: async ({ id, tecnicoId }: { id: string; tecnicoId: string }) =>
      (await apiClient.put<Ticket>(`/chamados/${id}/responsavel`, { tecnicoId })).data,
    onSuccess: (_data, input) => invalidate(input.id),
  })
}

export function useChangeTicketStatus() {
  const invalidate = useInvalidateTicket()
  return useMutation({
    mutationFn: async ({ id, ...body }: ChangeTicketStatusInput) => (await apiClient.put<Ticket>(`/chamados/${id}/status`, body)).data,
    onSuccess: (_data, input) => invalidate(input.id),
  })
}

export function useReopenTicket() {
  const invalidate = useInvalidateTicket()
  return useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => (await apiClient.post<Ticket>(`/chamados/${id}/reabrir`, { motivo })).data,
    onSuccess: (_data, input) => invalidate(input.id),
  })
}

const ticketErrorMessages: Record<string, string> = {
  CHAMADO_NAO_ABERTO: 'Este chamado não está mais aberto.',
  CHAMADO_JA_ATRIBUIDO: 'Este chamado já possui um técnico responsável.',
  CHAMADO_ENCERRADO: 'Chamados resolvidos ou cancelados não podem mudar de responsável.',
  PAPEL_INVALIDO: 'O usuário escolhido não é técnico.',
  TECNICO_FORA_DO_HOSPITAL: 'O técnico escolhido não está vinculado ao hospital deste chamado.',
  TRANSICAO_INVALIDA: 'Esta mudança de status não é permitida para o estado atual do chamado.',
  MOTIVO_OBRIGATORIO: 'Informe o motivo.',
  SOLUCAO_OBRIGATORIA: 'Descreva a solução aplicada.',
  CAUSA_INVALIDA: 'Categoria de causa inválida.',
}

/** Mensagem pt-BR por code do ProblemDetail; OT_ABERTA e códigos desconhecidos usam o detail do servidor. */
export function ticketActionErrorMessage(error: unknown, fallback = 'Não foi possível concluir a ação. Tente novamente.') {
  const data = typeof error === 'object' && error !== null && 'response' in error
    ? (error as { response?: { data?: { detail?: string; code?: string } } }).response?.data
    : undefined
  if (data?.code && data.code !== 'OT_ABERTA' && ticketErrorMessages[data.code]) return ticketErrorMessages[data.code]
  return data?.detail ?? fallback
}
