import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/axios'
import { usePagedQuery } from '@/lib/pagination'

/** Story 24.5: tipo do motivo da movimentação. */
export const TIPOS_MOTIVO = ['remanejamento', 'emprestimo', 'devolucao_emprestimo', 'outro'] as const
export type TipoMotivo = (typeof TIPOS_MOTIVO)[number]

export const tipoMotivoLabels: Record<TipoMotivo, string> = {
  remanejamento: 'Remanejamento',
  emprestimo: 'Empréstimo',
  devolucao_emprestimo: 'Devolução de empréstimo',
  outro: 'Outro',
}

/** Rótulo do tipo; ausente (movimentação anterior à 24.5) ou desconhecido = "Não informado". */
export const tipoMotivoLabel = (value: string | null | undefined) => (value && value in tipoMotivoLabels ? tipoMotivoLabels[value as TipoMotivo] : 'Não informado')

export const MOTIVO_MAX = 300

/** Item de GET /equipamentos/{id}/movimentacoes (Story 24.2), mais recente primeiro. */
export interface EquipmentMovement {
  id: string
  movimentadoEm: string
  setorOrigemId: string | null
  setorOrigemNome: string | null
  hospitalOrigemId: string | null
  hospitalOrigemNome: string | null
  setorDestinoId: string
  setorDestinoNome: string | null
  hospitalDestinoId: string
  hospitalDestinoNome: string | null
  movimentadoPor: string | null
  movimentadoPorNome: string | null
  motivo: string | null
  tipoMotivo: string | null
}

export interface TransferInput {
  setorDestinoId: string
  tipoMotivo: TipoMotivo
  motivo: string
  /** Ausente = agora (o backend usa o instante do pedido). */
  movimentadoEm?: string
  /** Idempotência: o reenvio do mesmo pedido não duplica a movimentação. */
  clientId: string
}

/** Histórico de movimentação, paginado no servidor (`pagina` 0-based, total em X-Total-Count). */
export function useEquipmentMovements(equipmentId: string, page: { pagina: number; tamanho: number }) {
  return usePagedQuery<EquipmentMovement>(['equipment-movements', equipmentId], `/equipamentos/${equipmentId}/movimentacoes`, { ...page }, Boolean(equipmentId))
}

/** POST /equipamentos/{id}/transferencias (Story 24.1): muda o setor e grava a movimentação; invalida ficha, lista e histórico. */
export function useTransferEquipment(equipmentId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (input: TransferInput) => (await apiClient.post<EquipmentMovement>(`/equipamentos/${equipmentId}/transferencias`, input)).data,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['equipment', equipmentId] })
      void client.invalidateQueries({ queryKey: ['equipments'] })
      void client.invalidateQueries({ queryKey: ['equipment-movements', equipmentId] })
    },
  })
}

/** Mensagem por code do backend da transferência. */
export function transferErrorMessage(error: unknown): string {
  const response = typeof error === 'object' && error !== null && 'response' in error
    ? (error as { response?: { status?: number; data?: { code?: string; detail?: string } } }).response
    : undefined
  const code = response?.data?.code
  const textos: Record<string, string> = {
    DESTINO_IGUAL_ORIGEM: 'O equipamento já está nesse setor. Escolha outro destino.',
    SETOR_DESATIVADO: 'O setor de destino está desativado. Escolha outro.',
    DATA_ANTERIOR_A_ULTIMA_MOVIMENTACAO: 'A data é anterior à última movimentação deste equipamento. Escolha uma data mais recente.',
    DATA_ANTERIOR_AO_CADASTRO: 'A data é anterior ao cadastro do equipamento.',
    DATA_INVALIDA: 'A data da movimentação não pode estar no futuro.',
    MOTIVO_OBRIGATORIO: 'Informe o motivo da transferência.',
    TIPO_MOTIVO_INVALIDO: 'Escolha o tipo do motivo.',
    CLIENT_ID_EM_USO: 'Esta transferência já foi registrada.',
  }
  if (code && textos[code]) return textos[code]
  if (response?.status === 403) return 'Seu perfil não pode fazer esta transferência (o técnico só transfere entre setores do mesmo hospital).'
  if (response?.status === 404) return 'Equipamento ou setor não encontrado para o seu perfil.'
  return response?.data?.detail || 'Não foi possível transferir o equipamento. Tente novamente.'
}
