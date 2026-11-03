/** Ordenação no servidor (`ordenar` + `direcao`); o cliente nunca reordena as listas de chamados e OTs. */
export type SortDirection = 'asc' | 'desc'

export interface SortChoice { value: string; label: string; field: string; direction: SortDirection }

/** Padrão dos chamados: severidade primeiro (crítica, alta, média, baixa; desempate pelo backend). */
export const DEFAULT_TICKET_SORT = 'severidade:asc'

const ticketSortChoices: SortChoice[] = [
  { value: 'severidade:asc', label: 'Severidade (mais urgente primeiro)', field: 'severidade', direction: 'asc' },
  { value: 'abertoEm:desc', label: 'Mais recentes', field: 'abertoEm', direction: 'desc' },
  { value: 'slaResolucaoAte:asc', label: 'Prazo de resolução (SLA)', field: 'slaResolucaoAte', direction: 'asc' },
]

/** O prazo de SLA não é ordenável para o papel Interno (o backend responde ORDENACAO_INDISPONIVEL). */
export function ticketSortChoicesFor(roles: readonly string[]): SortChoice[] {
  const canSortBySla = !roles.includes('interno_hospital') || roles.includes('admin_cliente') || roles.includes('tecnico')
  return ticketSortChoices.filter((choice) => choice.field !== 'slaResolucaoAte' || canSortBySla)
}

export const workOrderSortFields = [
  { value: 'dataAgendada', label: 'Data agendada' },
  { value: 'status', label: 'Status' },
  { value: 'codigo', label: 'Código' },
  { value: 'concluidaEm', label: 'Concluída em' },
] as const
export type WorkOrderSortField = (typeof workOrderSortFields)[number]['value']

export const sortDirectionOptions = [{ value: 'asc', label: 'Crescente' }, { value: 'desc', label: 'Decrescente' }]

export function parseDirection(raw: string | null): SortDirection {
  return raw === 'desc' ? 'desc' : 'asc'
}

/** Campo válido da URL ou vazio (ordem padrão do servidor). */
export function parseWorkOrderSort(raw: string | null): WorkOrderSortField | '' {
  return workOrderSortFields.some((field) => field.value === raw) ? (raw as WorkOrderSortField) : ''
}

/** Valor do seletor de chamados a partir da URL; desconhecido volta ao padrão. */
export function ticketSortFromUrl(ordenar: string | null, direcao: string | null, choices: SortChoice[]): string {
  if (!ordenar) return DEFAULT_TICKET_SORT
  const value = `${ordenar}:${parseDirection(direcao)}`
  return choices.some((choice) => choice.value === value) ? value : DEFAULT_TICKET_SORT
}

const orderingMessages: Record<string, string> = {
  ORDENACAO_INVALIDA: 'Esta ordenação não é válida. Voltamos para a ordem padrão.',
  ORDENACAO_INDISPONIVEL: 'Esta ordenação não está disponível para o seu perfil. Voltamos para a ordem padrão.',
}

/** Mensagem pt-BR quando o servidor recusa a ordenação (400 `ORDENACAO_*`); `undefined` para qualquer outro erro. */
export function orderingErrorMessage(error: unknown): string | undefined {
  const code = typeof error === 'object' && error !== null && 'response' in error
    ? (error as { response?: { data?: { code?: string } } }).response?.data?.code
    : undefined
  return code ? orderingMessages[code] : undefined
}
