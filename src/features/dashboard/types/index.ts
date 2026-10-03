export type WorkOrderStatus = 'open' | 'inProgress' | 'completed' | 'overdue'
export type TicketSeverity = 'critical' | 'high' | 'medium' | 'low'

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
  workOrdersByStatus: Array<{ status: WorkOrderStatus; label: string; count: number }>
  mtbfBySector: Array<{ sector: string; hours: number }>
  recentTickets: DashboardTicket[]
  unreadNotifications: number
}
