import type { BadgeVariant } from '@/components/ui/Badge'

/**
 * Tons semânticos únicos dos selos de condição (a cor nunca é a única informação: o texto do selo sempre aparece).
 * Estado: aberto/agendado neutro, em andamento azul, concluído verde, cancelado cinza (muted).
 * Severidade: crítica vermelho, alta âmbar, média e baixa neutros.
 * SLA: no prazo verde, em risco âmbar em contorno, vencido vermelho.
 */
export const canonicalStatus = (value: string) => value.toLocaleUpperCase('pt-BR').replaceAll('Ç', 'C').replaceAll('Ã', 'A')

export function ticketStatusTone(status: string): BadgeVariant {
  switch (canonicalStatus(status)) {
    case 'EM_ANDAMENTO': return 'info'
    case 'RESOLVIDO': return 'success'
    case 'CANCELADO': return 'muted'
    case 'AGUARDANDO_PECA': return 'warning'
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
    default: return 'neutral'
  }
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
  no_prazo: { tone: 'success', outline: false },
  em_risco: { tone: 'warning', outline: true },
  vencido: { tone: 'danger', outline: false },
}
