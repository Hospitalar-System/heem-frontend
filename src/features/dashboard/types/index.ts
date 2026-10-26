import { z } from 'zod'

export type WorkOrderStatus = 'scheduled' | 'inProgress' | 'completed' | 'canceled'
export type TicketSeverity = 'critical' | 'high' | 'medium' | 'low'
export type TicketSlaStatus = 'no_prazo' | 'em_risco' | 'vencido'

/**
 * Contrato de ENTRADA de GET /relatorios/dashboard (DashboardResponse do OpenAPI).
 * Tolerante: campos desconhecidos são ignorados e todos os campos são opcionais/anuláveis;
 * os padrões são aplicados na normalização.
 */
const count = z.number().nullish()

export const dashboardSummaryResponseSchema = z.object({
  agendadas: count,
  emExecucao: count,
  concluidas: count,
  canceladas: count,
  equipamentosAtivos: count,
  chamadosAbertosPorSeveridade: z.record(z.string(), z.number()).nullish(),
  chamadosSlaVencido: count,
  disponibilidadePercentual: count,
  otsPreventivasAtrasadas: count,
  documentosVencendo30d: count,
  chamadosRecentes: z.array(z.object({
    id: z.string().min(1),
    codigo: z.string().nullish(),
    severidade: z.string().nullish(),
    status: z.string().nullish(),
    abertoEm: z.string().nullish(),
    slaStatus: z.string().nullish(),
  })).nullish(),
}).refine((value) => Object.values(value).some((field) => field !== undefined), {
  message: 'Resposta sem nenhum campo conhecido do dashboard.',
})

export type DashboardSummaryResponse = z.infer<typeof dashboardSummaryResponseSchema>

/** A resposta chegou, mas não corresponde ao contrato esperado (distinto de falha de rede/servidor). */
export class DashboardContractError extends Error {
  constructor() {
    super('A resposta do dashboard não corresponde ao contrato esperado.')
    this.name = 'DashboardContractError'
  }
}

export interface DashboardTicket {
  id: string
  code: string
  severity: TicketSeverity | null
  statusLabel: string
  slaStatus: TicketSlaStatus | null
  openedLabel: string
}

export interface DashboardSummary {
  activeEquipment: number
  openWorkOrders: number
  inExecutionWorkOrders: number
  openTickets: number
  criticalTicketsOpen: number
  /** null quando o backend não informa a disponibilidade. */
  availabilityPercent: number | null
  overdueSla: number
  overduePreventiveWorkOrders: number
  expiringDocuments: number
  expiringDocumentsWithinDays: number
  emergenciesBySeverity: Array<{ severity: TicketSeverity; count: number }>
  workOrdersByStatus: Array<{ status: WorkOrderStatus; label: string; count: number }>
  recentTickets: DashboardTicket[]
}

const workOrderLabels: Record<WorkOrderStatus, string> = {
  scheduled: 'Agendadas',
  inProgress: 'Em execução',
  completed: 'Concluídas',
  canceled: 'Canceladas',
}

const severityByApi: Record<string, TicketSeverity> = {
  CRITICA: 'critical',
  ALTA: 'high',
  MEDIA: 'medium',
  BAIXA: 'low',
}

const ticketStatusLabels: Record<string, string> = {
  aberto: 'Aberto',
  em_andamento: 'Em andamento',
  aguardando_peca: 'Aguardando peça',
  resolvido: 'Resolvido',
  cancelado: 'Cancelado',
}

const slaStatuses: readonly string[] = ['no_prazo', 'em_risco', 'vencido']

function toSeverity(value?: string | null): TicketSeverity | null {
  return value ? severityByApi[value.trim().toUpperCase()] ?? null : null
}

function toStatusLabel(value?: string | null): string {
  if (!value) return '—'
  const key = value.trim().toLowerCase()
  return ticketStatusLabels[key] ?? key.replaceAll('_', ' ')
}

function formatOpenedAt(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

export function normalizeDashboardSummary(response: DashboardSummaryResponse): DashboardSummary {
  const bySeverity = new Map<TicketSeverity, number>()
  for (const [key, value] of Object.entries(response.chamadosAbertosPorSeveridade ?? {})) {
    const severity = toSeverity(key)
    if (severity) bySeverity.set(severity, (bySeverity.get(severity) ?? 0) + value)
  }
  const severities: TicketSeverity[] = ['critical', 'high', 'medium', 'low']
  const statusCounts: Record<WorkOrderStatus, number> = {
    scheduled: response.agendadas ?? 0,
    inProgress: response.emExecucao ?? 0,
    completed: response.concluidas ?? 0,
    canceled: response.canceladas ?? 0,
  }
  const statusOrder: WorkOrderStatus[] = ['scheduled', 'inProgress', 'completed', 'canceled']

  return {
    activeEquipment: response.equipamentosAtivos ?? 0,
    openWorkOrders: statusCounts.scheduled + statusCounts.inProgress,
    inExecutionWorkOrders: statusCounts.inProgress,
    openTickets: severities.reduce((total, severity) => total + (bySeverity.get(severity) ?? 0), 0),
    criticalTicketsOpen: bySeverity.get('critical') ?? 0,
    availabilityPercent: response.disponibilidadePercentual ?? null,
    overdueSla: response.chamadosSlaVencido ?? 0,
    overduePreventiveWorkOrders: response.otsPreventivasAtrasadas ?? 0,
    expiringDocuments: response.documentosVencendo30d ?? 0,
    expiringDocumentsWithinDays: 30,
    emergenciesBySeverity: severities.map((severity) => ({ severity, count: bySeverity.get(severity) ?? 0 })),
    workOrdersByStatus: statusOrder.map((status) => ({ status, label: workOrderLabels[status], count: statusCounts[status] })),
    recentTickets: (response.chamadosRecentes ?? []).map((ticket) => ({
      id: ticket.id,
      code: ticket.codigo || ticket.id,
      severity: toSeverity(ticket.severidade),
      statusLabel: toStatusLabel(ticket.status),
      slaStatus: ticket.slaStatus && slaStatuses.includes(ticket.slaStatus) ? ticket.slaStatus as TicketSlaStatus : null,
      openedLabel: formatOpenedAt(ticket.abertoEm),
    })),
  }
}

export function isDashboardSummaryEmpty(data: DashboardSummary): boolean {
  return data.activeEquipment === 0
    && data.openWorkOrders === 0
    && data.openTickets === 0
    && (data.availabilityPercent ?? 0) === 0
    && data.overdueSla === 0
    && data.overduePreventiveWorkOrders === 0
    && data.expiringDocuments === 0
    && data.workOrdersByStatus.every(({ count }) => count === 0)
    && data.recentTickets.length === 0
}
