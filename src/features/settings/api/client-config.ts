import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/axios'

/** Story 23.2: configuração do cliente (só admin). */
export interface ClientConfig {
  janelaQualidadeAnaliseDias: number
  /** true enquanto o cliente nunca alterou (vale o padrão de 30 dias). */
  padrao: boolean
  atualizadoEm: string | null
  atualizadoPor: string | null
  /** Story 23.8 (aditivo): N de 2 a 20, padrão 3. */
  reincidenciaChamados?: number
  /** Story 23.8 (aditivo): D de 7 a 365, padrão 90. */
  reincidenciaDias?: number
  /** Story 29.6 (aditivo): preventiva Não apto abre o chamado sozinha; padrão false. */
  abrirChamadoAutomatico?: boolean
}

export const JANELA_MIN = 7
export const JANELA_MAX = 365
export const JANELA_PADRAO = 30

export const clientConfigKey = ['configuracao-cliente'] as const

export function useClientConfig() {
  return useQuery({ queryKey: clientConfigKey, queryFn: async () => (await apiClient.get<ClientConfig>('/configuracao-cliente')).data })
}

export function useSaveClientConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (janelaQualidadeAnaliseDias: number) => (await apiClient.put<ClientConfig>('/configuracao-cliente', { janelaQualidadeAnaliseDias })).data,
    onSuccess: (config) => queryClient.setQueryData(clientConfigKey, config),
  })
}

export function clientConfigErrorMessage(error: unknown) {
  const response = (error as { response?: { status?: number; data?: { code?: string } } } | null)?.response
  if (response?.data?.code === 'JANELA_INVALIDA') return `A janela deve ficar entre ${JANELA_MIN} e ${JANELA_MAX} dias.`
  if (response?.status === 403) return 'Só o administrador do cliente pode alterar esta configuração.'
  if (!response) return 'Sem conexão com o servidor. Verifique a internet e tente novamente.'
  return 'Não foi possível salvar a configuração. Tente novamente.'
}

/** Story 23.8: regra do selo de reincidência (N chamados de falha em D dias), no mesmo PUT da configuração. */
export const REINCIDENCIA_CHAMADOS_MIN = 2
export const REINCIDENCIA_CHAMADOS_MAX = 20
export const REINCIDENCIA_CHAMADOS_PADRAO = 3
export const REINCIDENCIA_DIAS_MIN = 7
export const REINCIDENCIA_DIAS_MAX = 365
export const REINCIDENCIA_DIAS_PADRAO = 90

export function useSaveRecurrenceRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (rule: { reincidenciaChamados: number; reincidenciaDias: number }) => (await apiClient.put<ClientConfig>('/configuracao-cliente', rule)).data,
    onSuccess: (config) => queryClient.setQueryData(clientConfigKey, config),
  })
}

export function recurrenceRuleErrorMessage(error: unknown) {
  const response = (error as { response?: { status?: number; data?: { code?: string } } } | null)?.response
  if (response?.data?.code === 'REINCIDENCIA_INVALIDA') return `Use de ${REINCIDENCIA_CHAMADOS_MIN} a ${REINCIDENCIA_CHAMADOS_MAX} chamados e de ${REINCIDENCIA_DIAS_MIN} a ${REINCIDENCIA_DIAS_MAX} dias.`
  return clientConfigErrorMessage(error)
}

/** Story 29.6: liga ou desliga a abertura automática do chamado da preventiva Não apto (só admin). */
export function useSaveAutoOpenTicket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (abrirChamadoAutomatico: boolean) => (await apiClient.put<ClientConfig>('/configuracao-cliente', { abrirChamadoAutomatico })).data,
    onSuccess: (config) => queryClient.setQueryData(clientConfigKey, config),
  })
}
