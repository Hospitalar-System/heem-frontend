import { z } from 'zod'

export const workOrderStatusSchema = z.enum(['open', 'inProgress', 'completed', 'overdue'])
export const ticketSeveritySchema = z.enum(['critical', 'high', 'medium', 'low'])

export const dashboardSummaryResponseSchema = z.object({
  tenant: z.object({ name: z.string(), hospitalCount: z.number().int().nonnegative() }),
  kpis: z.object({
    activeEquipment: z.object({ value: z.number().nonnegative(), changePercent: z.number() }),
    openWorkOrders: z.object({ value: z.number().nonnegative(), newToday: z.number().nonnegative() }),
    emergencies: z.object({ value: z.number().nonnegative(), criticalOpen: z.number().nonnegative() }),
    availability: z.object({ percent: z.number().min(0).max(100), weeklyChangePp: z.number() }),
    overdueSla: z.object({ count: z.number().nonnegative() }),
    overduePreventiveWorkOrders: z.object({ count: z.number().nonnegative() }),
    expiringDocuments: z.object({ count: z.number().nonnegative(), withinDays: z.number().int().positive().optional() }),
  }),
  emergenciesBySeverity: z.array(z.object({ severity: ticketSeveritySchema, count: z.number().nonnegative() })),
  workOrdersByStatus: z.array(z.object({ status: workOrderStatusSchema, count: z.number().nonnegative() })),
  mtbfBySector: z.array(z.object({ sector: z.string(), hours: z.number().nonnegative() })),
  recentTickets: z.array(z.object({
    id: z.string(),
    equipmentName: z.string(),
    hospitalName: z.string(),
    sectorName: z.string(),
    severity: ticketSeveritySchema,
    openedAt: z.string().datetime({ offset: true }),
  })),
})

export type WorkOrderStatus = z.infer<typeof workOrderStatusSchema>
export type TicketSeverity = z.infer<typeof ticketSeveritySchema>
export type DashboardSummaryResponse = z.infer<typeof dashboardSummaryResponseSchema>

export interface DashboardTicket {
  id: string
  equipment: string
  hospital: string
  sector: string
  severity: TicketSeverity
  openedLabel: string
}

export interface DashboardSummary {
  tenantName: string
  hospitalCount: number
  activeEquipment: number
  equipmentChangePercent: number
  openWorkOrders: number
  newWorkOrdersToday: number
  emergenciesToday: number
  criticalEmergenciesOpen: number
  availabilityPercent: number
  availabilityChangePp: number
  overdueSla: number
  overduePreventiveWorkOrders: number
  expiringDocuments: number
  expiringDocumentsWithinDays?: number
  emergenciesBySeverity: Array<{ severity: TicketSeverity; count: number }>
  workOrdersByStatus: Array<{ status: WorkOrderStatus; label: string; count: number }>
  mtbfBySector: Array<{ sector: string; hours: number }>
  recentTickets: DashboardTicket[]
}

const workOrderLabels: Record<WorkOrderStatus, string> = {
  open: 'Aberto',
  inProgress: 'Em andamento',
  completed: 'Concluído',
  overdue: 'Atrasado',
}

export function normalizeDashboardSummary(response: DashboardSummaryResponse): DashboardSummary {
  const severities: TicketSeverity[] = ['critical', 'high', 'medium', 'low']
  const statusOrder: WorkOrderStatus[] = ['open', 'inProgress', 'completed', 'overdue']
  const severityCounts = new Map(response.emergenciesBySeverity.map(({ severity, count }) => [severity, count]))
  const statusCounts = new Map(response.workOrdersByStatus.map(({ status, count }) => [status, count]))

  return {
    tenantName: response.tenant.name,
    hospitalCount: response.tenant.hospitalCount,
    activeEquipment: response.kpis.activeEquipment.value,
    equipmentChangePercent: response.kpis.activeEquipment.changePercent,
    openWorkOrders: response.kpis.openWorkOrders.value,
    newWorkOrdersToday: response.kpis.openWorkOrders.newToday,
    emergenciesToday: response.kpis.emergencies.value,
    criticalEmergenciesOpen: response.kpis.emergencies.criticalOpen,
    availabilityPercent: response.kpis.availability.percent,
    availabilityChangePp: response.kpis.availability.weeklyChangePp,
    overdueSla: response.kpis.overdueSla.count,
    overduePreventiveWorkOrders: response.kpis.overduePreventiveWorkOrders.count,
    expiringDocuments: response.kpis.expiringDocuments.count,
    expiringDocumentsWithinDays: response.kpis.expiringDocuments.withinDays,
    emergenciesBySeverity: severities.map((severity) => ({ severity, count: severityCounts.get(severity) ?? 0 })),
    workOrdersByStatus: statusOrder.map((status) => ({ status, label: workOrderLabels[status], count: statusCounts.get(status) ?? 0 })),
    mtbfBySector: response.mtbfBySector,
    recentTickets: response.recentTickets.map((ticket) => ({
      id: ticket.id,
      equipment: ticket.equipmentName,
      hospital: ticket.hospitalName,
      sector: ticket.sectorName,
      severity: ticket.severity,
      openedLabel: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(ticket.openedAt)),
    })),
  }
}

export function isDashboardSummaryEmpty(data: DashboardSummary): boolean {
  return data.activeEquipment === 0
    && data.openWorkOrders === 0
    && data.emergenciesToday === 0
    && data.availabilityPercent === 0
    && data.overdueSla === 0
    && data.overduePreventiveWorkOrders === 0
    && data.expiringDocuments === 0
    && data.workOrdersByStatus.every(({ count }) => count === 0)
    && data.emergenciesBySeverity.every(({ count }) => count === 0)
    && data.mtbfBySector.length === 0
    && data.recentTickets.length === 0
}
