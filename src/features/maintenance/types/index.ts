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
