import type { EquipmentState } from '../types'

/** Rótulos de tela do estado (contrato heem-backend#208). Valor desconhecido mostra o texto cru. */
export const equipmentStateLabels: Record<EquipmentState, string> = {
  ATIVO: 'Apto',
  NAO_APTO: 'Não apto',
  EM_MANUTENCAO: 'Em manutenção',
  DESATIVADO: 'Desativado',
  INATIVO: 'Inativo',
  DESCARTADO: 'Descartado',
}

export const DESCRIPTION_MAX = 200
/** Escolha rápida: disponível para técnico e admin. */
export const QUICK_STATES: readonly EquipmentState[] = ['ATIVO', 'NAO_APTO', 'EM_MANUTENCAO', 'DESATIVADO']
/** Só admin: fora da escolha rápida. */
export const ADMIN_ONLY_STATES: readonly EquipmentState[] = ['INATIVO', 'DESCARTADO']

export function isKnownState(value: string | null | undefined): value is EquipmentState {
  return Boolean(value) && Object.prototype.hasOwnProperty.call(equipmentStateLabels, value as string)
}

export function equipmentStateLabel(value: string | null | undefined): string {
  if (!value) return '—'
  return isKnownState(value) ? equipmentStateLabels[value] : value
}

/** Só DESCARTADO é terminal: nenhuma mudança é oferecida a partir dele. */
export function canChangeFrom(state: string | null | undefined) {
  return state !== 'DESCARTADO'
}

export type StateRole = 'admin' | 'tecnico' | 'leitura'
export function stateRole(roles: readonly string[]): StateRole {
  if (roles.includes('admin_cliente')) return 'admin'
  if (roles.includes('tecnico')) return 'tecnico'
  return 'leitura'
}

/** Mensagens pt-BR por `code` do backend ao alterar o estado. */
export function changeStateErrorMessage(error: unknown): string {
  const response = (error as { response?: { status?: number; data?: { code?: string } } } | null)?.response
  switch (response?.data?.code) {
    case 'DESCRICAO_OBRIGATORIA': return 'Informe a descrição: ela é obrigatória para Em manutenção.'
    case 'ACESSO_NEGADO': return 'Seu perfil não pode colocar o equipamento neste estado.'
    case 'TRANSICAO_INVALIDA': return 'Este equipamento foi descartado e não pode mais mudar de estado.'
    case 'VALIDACAO_FALHOU': return 'Dados inválidos: confira o estado e a descrição (até 200 caracteres).'
  }
  if (response?.status === 404) return 'Equipamento não encontrado.'
  if (!response) return 'Sem conexão com o servidor. Verifique a internet e tente novamente.'
  return 'Não foi possível alterar o estado. Tente novamente.'
}
