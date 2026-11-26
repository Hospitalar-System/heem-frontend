import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/axios'

/** Story 23.2: configuração do cliente (só admin). */
export interface ClientConfig {
  janelaQualidadeAnaliseDias: number
  /** true enquanto o cliente nunca alterou (vale o padrão de 30 dias). */
  padrao: boolean
  atualizadoEm: string | null
  atualizadoPor: string | null
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
