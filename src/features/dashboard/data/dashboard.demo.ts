import type { DashboardSummary } from '../types'

// Sample content copied from the Figma presentation frame. Replace with the
// dashboard API response when the backend contract is available.
export const dashboardDemoData: DashboardSummary = {
  tenantName: 'Grupo Vitale Saúde',
  hospitalCount: 2,
  activeEquipment: 1284,
  equipmentChangePercent: 3.2,
  openWorkOrders: 47,
  newWorkOrdersToday: 8,
  emergenciesToday: 3,
  criticalEmergenciesOpen: 2,
  availabilityPercent: 97.4,
  availabilityChangePp: 0.6,
  workOrdersByStatus: [
    { status: 'open', label: 'Aberto', count: 32 },
    { status: 'inProgress', label: 'Em andamento', count: 47 },
    { status: 'completed', label: 'Concluído', count: 58 },
    { status: 'overdue', label: 'Atrasado', count: 11 },
  ],
  // Relative sample points approximate the line shape in Figma; they are not
  // calculated MTBF values and must be replaced by backend aggregates.
  mtbfBySector: [
    { sector: 'UTI', hours: 320 },
    { sector: 'C.Cir', hours: 410 },
    { sector: 'Emerg', hours: 370 },
    { sector: 'Rad', hours: 510 },
    { sector: 'Lab', hours: 460 },
    { sector: 'Int', hours: 600 },
  ],
  recentTickets: [
    { id: 'CH-3391', equipment: 'Ventilador Mecânico VentPro', hospital: 'Santa Casa', sector: 'UTI Adulto', severity: 'critical', openedLabel: 'há 12 min' },
    { id: 'CH-3390', equipment: 'Bomba de Infusão InfuMax 3', hospital: 'Santa Casa', sector: 'Emergência', severity: 'high', openedLabel: 'há 40 min' },
    { id: 'CH-3388', equipment: 'Monitor Multiparâmetros CardioView', hospital: 'H. São Lucas', sector: 'Centro Cirúrgico', severity: 'medium', openedLabel: 'há 1h 20' },
    { id: 'CH-3385', equipment: 'Desfibrilador LifeShock D200', hospital: 'H. São Lucas', sector: 'UTI Neonatal', severity: 'high', openedLabel: 'há 2h' },
    { id: 'CH-3382', equipment: 'Autoclave SteriLine 90', hospital: 'Santa Casa', sector: 'CME', severity: 'low', openedLabel: 'há 3h' },
  ],
}
