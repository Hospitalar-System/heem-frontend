import type { Campaign } from '../types/campaigns'
import type { PreventivePlan } from '../types'

/** Escopo de uma rotina preventiva: equipamento (plano) ou setor/hospital (campanha). */
export type RoutineScope = 'equipamento' | 'setor' | 'hospital'
export const routineScopeLabels: Record<RoutineScope, string> = { equipamento: 'Equipamento', setor: 'Setor', hospital: 'Hospital' }

/** Situação única mostrada na lista, normalizada entre plano (ativo/inativo) e campanha (status de execução). */
export type RoutineSituation = 'ativa' | 'em_execucao' | 'concluida' | 'cancelada' | 'falhou' | 'inativa'
export const routineSituationLabels: Record<RoutineSituation, string> = {
  ativa: 'Ativa', em_execucao: 'Em execução', concluida: 'Concluída', cancelada: 'Cancelada', falhou: 'Falhou', inativa: 'Inativa',
}
export const routineSituationTones: Record<RoutineSituation, 'success' | 'warning' | 'danger' | 'neutral' | 'info'> = {
  ativa: 'success', em_execucao: 'info', concluida: 'neutral', cancelada: 'neutral', falhou: 'danger', inativa: 'neutral',
}

/** Plano: ativo -> Ativa; desativado -> Inativa. */
export function planSituation(plan: Pick<PreventivePlan, 'ativo'>): RoutineSituation {
  return plan.ativo ? 'ativa' : 'inativa'
}

/**
 * Campanha: na fila/gerando -> Em execução; falhou/cancelada mantêm o nome;
 * concluída segue Ativa enquanto ainda tem próxima repetição (recorrente), senão Concluída.
 */
export function campaignSituation(campaign: Pick<Campaign, 'status' | 'ativa' | 'proximaData'>): RoutineSituation {
  switch (campaign.status) {
    case 'pendente':
    case 'processando': return 'em_execucao'
    case 'falhou': return 'falhou'
    case 'cancelada': return 'cancelada'
    default: return campaign.ativa && campaign.proximaData ? 'ativa' : 'concluida'
  }
}

/** "Ativas" no filtro: o que ainda corre ou pede atenção (inclui Falhou). */
export function isRoutineActive(situation: RoutineSituation) {
  return situation === 'ativa' || situation === 'em_execucao' || situation === 'falhou'
}

/** Campanha sem setor escolhido vale o hospital inteiro; com um ou mais setores é de Setor. */
export function campaignScope(campaign: Pick<Campaign, 'setorIds'>): 'setor' | 'hospital' {
  return campaign.setorIds.length > 0 ? 'setor' : 'hospital'
}

export type Routine = {
  key: string
  scope: RoutineScope
  situation: RoutineSituation
  /** Próxima execução (data civil `YYYY-MM-DD`); nula quando não há mais execuções. */
  next: string | null
  concluidas: number
  total: number
  /** Texto usado para desempate na ordenação (nome da campanha ou id do equipamento). */
  sortName: string
} & ({ kind: 'plano'; plan: PreventivePlan } | { kind: 'campanha'; campaign: Campaign })

export function planToRoutine(plan: PreventivePlan): Routine {
  return {
    key: `plano:${plan.id}`, kind: 'plano', plan, scope: 'equipamento', situation: planSituation(plan),
    next: plan.ativo ? (plan.proximaExecucao ?? plan.proximaData ?? null) : null,
    concluidas: plan.otsConcluidas ?? 0, total: plan.otsGeradas ?? 0, sortName: plan.equipamentoId,
  }
}

export function campaignToRoutine(campaign: Campaign): Routine {
  return {
    key: `campanha:${campaign.id}`, kind: 'campanha', campaign, scope: campaignScope(campaign), situation: campaignSituation(campaign),
    next: campaign.ativa ? campaign.proximaData : null,
    concluidas: campaign.ots?.concluidas ?? 0, total: campaign.ots?.total ?? 0, sortName: campaign.nome,
  }
}

/** Próxima execução mais próxima primeiro; sem data vai para o fim; empate pelo nome. */
export function sortByNextExecution(routines: Routine[]): Routine[] {
  return [...routines].sort((a, b) => {
    if (a.next && b.next && a.next !== b.next) return a.next < b.next ? -1 : 1
    if (Boolean(a.next) !== Boolean(b.next)) return a.next ? -1 : 1
    return a.sortName.localeCompare(b.sortName, 'pt-BR')
  })
}

export function routineOtsLink(routine: Routine) {
  return routine.kind === 'plano'
    ? `/work-orders?planoPreventivoId=${encodeURIComponent(routine.plan.id)}`
    : `/work-orders?campanhaPreventivaId=${encodeURIComponent(routine.campaign.id)}`
}

export type RoutineScopeFilter = '' | RoutineScope
export function scopeFromUrl(raw: string | null): RoutineScopeFilter {
  return raw === 'equipamento' || raw === 'setor' || raw === 'hospital' ? raw : ''
}
