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
  codigo?: string | null
  tecnicoResponsavelId?: string | null
  primeiraRespostaEm?: string | null
  canceladoEm?: string | null
  solucao?: string | null
  causaCategoria?: string | null
  reaberturas?: number | null
  prontoParaResolver?: boolean | null
}

export const ticketCauseCategories = ['desgaste', 'falha_eletrica', 'falha_mecanica', 'uso_inadequado', 'falta_insumo', 'software', 'outra'] as const
export type TicketCauseCategory = (typeof ticketCauseCategories)[number]

export const ticketCauseLabels: Record<TicketCauseCategory, string> = {
  desgaste: 'Desgaste',
  falha_eletrica: 'Falha elétrica',
  falha_mecanica: 'Falha mecânica',
  uso_inadequado: 'Uso inadequado',
  falta_insumo: 'Falta de insumo',
  software: 'Software',
  outra: 'Outra',
}

/** Destinos de transição manual de status; ABERTO -> EM_ANDAMENTO nunca é manual (AD-15). */
export type TicketManualStatus = 'AGUARDANDO_PECA' | 'EM_ANDAMENTO' | 'RESOLVIDO' | 'CANCELADO'

export interface ChangeTicketStatusInput {
  id: string
  novoStatus: TicketManualStatus
  motivo?: string
  solucao?: string
  causaCategoria?: TicketCauseCategory
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

/** Tipos oferecidos ao criar/editar: SELECAO (lista de opções) só aparece como valor atual de um item já existente. */
export function checklistItemTypeChoices(current?: string | null): Array<{ value: ChecklistItemType; label: string }> {
  const types = checklistItemTypes.filter((tipo) => tipo !== 'SELECAO' || normalizeChecklistItemType(current) === 'SELECAO')
  return types.map((tipo) => ({ value: tipo, label: checklistItemTypeLabels[tipo] }))
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
