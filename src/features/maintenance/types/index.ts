export type TicketStatus = 'ABERTO' | 'EM_ANDAMENTO' | 'AGUARDANDO_PECA' | 'RESOLVIDO' | 'CANCELADO' | string
export type TicketSeverity = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA' | string

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
