import { describe, expect, it } from 'vitest'
import { dashboardSummaryResponseSchema, isDashboardSummaryEmpty, normalizeDashboardSummary } from '../types'

const realPayload = {
  agendadas: 2,
  emExecucao: 1,
  concluidas: 4,
  canceladas: 1,
  equipamentosAtivos: 5,
  chamadosAbertosPorSeveridade: { BAIXA: 0, MEDIA: 1, ALTA: 1, CRITICA: 1 },
  chamadosSlaVencido: 0,
  disponibilidadePercentual: 77.68,
  otsPreventivasAtrasadas: 1,
  documentosVencendo30d: 0,
  chamadosRecentes: [{
    id: 'abc',
    codigo: 'CH-5',
    hospitalId: 'h',
    equipamentoId: 'e',
    severidade: 'alta',
    status: 'aberto',
    abertoEm: '2026-10-03T22:07:46.304410Z',
    slaStatus: null,
  }],
}

function normalize(data: unknown) {
  return normalizeDashboardSummary(dashboardSummaryResponseSchema.parse(data))
}

describe('normalizeDashboardSummary', () => {
  it('mapeia o payload real do backend', () => {
    const summary = normalize(realPayload)
    expect(summary).toMatchObject({
      activeEquipment: 5,
      openWorkOrders: 3,
      inExecutionWorkOrders: 1,
      openTickets: 3,
      criticalTicketsOpen: 1,
      availabilityPercent: 77.68,
      overdueSla: 0,
      overduePreventiveWorkOrders: 1,
      expiringDocuments: 0,
    })
    expect(summary.emergenciesBySeverity).toEqual([
      { severity: 'critical', count: 1 },
      { severity: 'high', count: 1 },
      { severity: 'medium', count: 1 },
      { severity: 'low', count: 0 },
    ])
    expect(summary.workOrdersByStatus.map(({ status, count }) => [status, count])).toEqual([['scheduled', 2], ['inProgress', 1], ['completed', 4], ['canceled', 1]])
    expect(summary.recentTickets[0]).toMatchObject({ id: 'abc', code: 'CH-5', severity: 'high', statusLabel: 'Aberto', slaStatus: null })
    expect(summary.recentTickets[0].openedLabel).not.toBe('—')
    expect(isDashboardSummaryEmpty(summary)).toBe(false)
  })

  it('degrada com graça para vazio e nulos', () => {
    const summary = normalize({ chamadosAbertosPorSeveridade: null, disponibilidadePercentual: null, chamadosRecentes: [{ id: 'z', abertoEm: 'lixo', severidade: null, status: 'aguardando_peca', slaStatus: 'vencido' }] })
    expect(summary.availabilityPercent).toBeNull()
    expect(summary.openTickets).toBe(0)
    expect(summary.recentTickets[0]).toMatchObject({ code: 'z', severity: null, statusLabel: 'Aguardando peça', slaStatus: 'vencido', openedLabel: '—' })
    expect(isDashboardSummaryEmpty(normalize({ equipamentosAtivos: 0 }))).toBe(true)
  })

  it('rejeita respostas sem nenhum campo conhecido ou com tipos inválidos', () => {
    expect(dashboardSummaryResponseSchema.safeParse({ kpis: {}, tenant: {} }).success).toBe(false)
    expect(dashboardSummaryResponseSchema.safeParse(null).success).toBe(false)
    expect(dashboardSummaryResponseSchema.safeParse({ agendadas: 'muitas' }).success).toBe(false)
  })
})
