import type { BadgeVariant } from '@/components/ui/Badge'

/**
 * Tons semânticos únicos dos selos de condição (a cor nunca é a única informação: o texto do selo sempre aparece).
 * Estado: aberto/agendado neutro, em andamento azul, concluído verde, cancelado cinza (muted).
 * Severidade: crítica vermelho, alta âmbar, média e baixa neutros.
 * SLA: no prazo verde, em risco âmbar, vencido vermelho, sempre em contorno (a forma separa a família SLA de Estado e Severidade, que são preenchidos).
 * Estado do equipamento: apto verde, não apto vermelho, em manutenção âmbar, desativado neutro, inativo/descartado cinza apagado.
 */
export const canonicalStatus = (value: string) => value.toLocaleUpperCase('pt-BR').replaceAll('Ç', 'C').replaceAll('Ã', 'A')

export function ticketStatusTone(status: string): BadgeVariant {
  switch (canonicalStatus(status)) {
    case 'EM_ANDAMENTO': return 'info'
    case 'RESOLVIDO': return 'success'
    case 'CANCELADO': return 'muted'
    case 'AGUARDANDO_PECA': return 'warning'
    // Story 29.3: atendimento pausado (chamado ainda aberto).
    case 'PAUSADO': return 'warning'
    default: return 'neutral'
  }
}

export function workOrderStatusTone(status: string): BadgeVariant {
  switch (canonicalStatus(status)) {
    case 'EM_EXECUCAO':
    case 'EM_ANDAMENTO': return 'info'
    case 'CONCLUIDA':
    case 'CONCLUIDO': return 'success'
    case 'CANCELADA':
    case 'CANCELADO': return 'muted'
    // Story 23.7: encerrada sem execução porque o equipamento estava em uso (não é falha do equipamento).
    case 'NAO_REALIZADA': return 'warning'
    default: return 'neutral'
  }
}

/** Rótulos dos status de OT (inclui NAO_REALIZADA da Story 23.7); valor desconhecido sai como texto cru. */
export const workOrderStatusLabels: Record<string, string> = {
  AGENDADA: 'Agendada', EM_EXECUCAO: 'Em execução', EM_ANDAMENTO: 'Em andamento', CONCLUIDA: 'Concluída', CONCLUIDO: 'Concluída',
  CANCELADA: 'Cancelada', CANCELADO: 'Cancelada', NAO_REALIZADA: 'Não realizada',
}
export function workOrderStatusLabel(status: string) {
  return workOrderStatusLabels[canonicalStatus(status)] ?? status.replaceAll('_', ' ')
}

export function severityTone(severity: string): BadgeVariant {
  switch (canonicalStatus(severity)) {
    case 'CRITICA': return 'danger'
    case 'ALTA': return 'warning'
    default: return 'neutral'
  }
}

export type SlaTone = { tone: BadgeVariant; outline: boolean }
export const slaTones: Record<'no_prazo' | 'em_risco' | 'vencido', SlaTone> = {
  no_prazo: { tone: 'success', outline: true },
  em_risco: { tone: 'warning', outline: true },
  vencido: { tone: 'danger', outline: true },
}

export function equipmentStateTone(state: string): BadgeVariant {
  switch (state) {
    case 'ATIVO': return 'success'
    case 'NAO_APTO': return 'danger'
    case 'EM_MANUTENCAO': return 'warning'
    case 'INATIVO':
    case 'DESCARTADO': return 'muted'
    default: return 'neutral'
  }
}
