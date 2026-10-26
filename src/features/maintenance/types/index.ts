export type TicketStatus = 'ABERTO' | 'EM_ANDAMENTO' | 'AGUARDANDO_PECA' | 'RESOLVIDO' | 'CANCELADO' | string
export type TicketSeverity = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA' | string
export type TicketSlaStatus = 'no_prazo' | 'em_risco' | 'vencido' | null

export interface Ticket {
  id: string
  hospitalId: string
  setorId: string
  equipamentoId: string
  abertoPor: string
  descricao: string
  severidade: TicketSeverity
  status: TicketStatus
  abertoEm: string
  slaAtendimentoAte?: string | null
  slaResolucaoAte?: string | null
  slaStatus?: TicketSlaStatus
}

export interface TicketHistoryEvent {
  acao: string
  atorId: string | null
  ocorridoEm: string
}

export interface CorrectiveWorkOrderInput {
  codigo: string
  chamadoId: string
  tecnicoId: string
  local?: string
  dataAgendada?: string
}

export interface CorrectiveWorkOrder {
  id: string
  codigo: string
  tipo: string
  status: string
  equipamentoId: string
  chamadoId: string
}

export interface ChecklistSummary {
  id: string
  nome: string
  ativo?: boolean
  descricao?: string | null
  quantidadeItens?: number
}

export const checklistItemTypes = ['NUMERICO', 'BOOLEANO', 'TEXTO', 'SELECAO'] as const
export type ChecklistItemType = (typeof checklistItemTypes)[number]

const checklistItemTypeLabels: Record<ChecklistItemType, string> = {
  NUMERICO: 'Número (medição)',
  BOOLEANO: 'Sim ou Não',
  TEXTO: 'Texto livre',
  SELECAO: 'Lista de opções',
}

function isChecklistItemType(value: unknown): value is ChecklistItemType {
  return typeof value === 'string' && (checklistItemTypes as readonly string[]).includes(value)
}

/** Normaliza o tipo vindo da API (legado/minúsculas) para o enum canônico; desconhecido vira undefined. */
export function normalizeChecklistItemType(tipo?: string | null): ChecklistItemType | undefined {
  const value = tipo?.trim().toUpperCase()
  return isChecklistItemType(value) ? value : undefined
}

/** Rótulo hospitalar do tipo; valor desconhecido é mostrado como veio. */
export function checklistItemTypeLabel(tipo?: string | null): string {
  const normalized = normalizeChecklistItemType(tipo)
  return normalized ? checklistItemTypeLabels[normalized] : (tipo ?? '')
}

export interface ChecklistItem {
  id: string
  descricao: string
  tipo: string
  unidade?: string | null
  obrigatorio: boolean
  ordem: number
}

export interface CreateChecklistInput {
  codigo: string
  nome: string
  itens: SaveChecklistItemInput[]
}

export interface SaveChecklistItemInput {
  descricao: string
  tipo: ChecklistItemType
  unidade?: string | null
  obrigatorio: boolean
}

export interface PreventiveWorkOrderInput {
  codigo: string
  equipamentoId: string
  checklistId: string
  tecnicoId: string
  dataAgendada: string
}

export interface WorkOrderListItem {
  id: string
  codigo: string
  tipo: string
  status: string
  equipamentoId: string
  checklistId: string | null
  tecnicoId?: string | null
  local: string | null
  dataAgendada: string | null
  iniciadaEm: string | null
  concluidaEm: string | null
  atrasada?: boolean
  planoPreventivoId?: string | null
}

export interface WorkOrderDetail {
  id: string
  codigo: string
  tipo: string
  status: string
  equipamentoId: string
  checklistId: string | null
  tecnicoId?: string | null
  chamadoId?: string | null
  local: string | null
  dataAgendada: string | null
  iniciadaEm: string | null
  concluidaEm: string | null
}

export interface WorkOrderChecklistItem {
  id: string
  descricao: string
  obrigatorio?: boolean
  concluido?: boolean
  ordem?: number
}
