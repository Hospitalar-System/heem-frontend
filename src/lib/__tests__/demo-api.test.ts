import { describe, expect, it } from 'vitest'
import { apiClient } from '../axios'
import { isDemoMode } from '../demo-mode'
import { dashboardSummaryResponseSchema } from '@/features/dashboard/types'

describe('modo de demonstração', () => {
  it('é ativado automaticamente quando a API não está configurada', () => {
    expect(isDemoMode).toBe(true)
  })

  it('responde às telas principais sem depender da API', async () => {
    const [hospitals, dashboard, orders] = await Promise.all([
      apiClient.get('/hospitais'),
      apiClient.get('/relatorios/dashboard'),
      apiClient.get('/ordens-de-trabalho'),
    ])

    expect(hospitals.data).toHaveLength(2)
    expect(dashboardSummaryResponseSchema.safeParse(dashboard.data).success).toBe(true)
    expect(dashboard.data.chamadosRecentes).toHaveLength(2)
    expect(orders.data).toHaveLength(2)
  })

  it('responde indicadores (mtta/mttr, agrupados), backlog e top de equipamentos sem campos deprecated', async () => {
    const [total, byHospital, bySector, backlog, top] = await Promise.all([
      apiClient.get('/relatorios/indicadores'),
      apiClient.get('/relatorios/indicadores', { params: { agrupar: 'hospital' } }),
      apiClient.get('/relatorios/indicadores', { params: { agrupar: 'setor' } }),
      apiClient.get('/relatorios/backlog'),
      apiClient.get('/relatorios/top-equipamentos'),
    ])

    expect(total.data).toMatchObject({ mttaHoras: expect.any(Number), mttrHoras: expect.any(Number), slaAtendimentoPct: expect.any(Number) })
    expect(total.data).not.toHaveProperty('tempoMedioAtendimentoHoras')
    expect(total.data).not.toHaveProperty('tempoMedioResolucaoHoras')
    expect(total.data.grupos).toBeNull()
    expect(byHospital.data.grupos).toHaveLength(2)
    expect(bySector.data.grupos).toHaveLength(3)
    expect(backlog.data.porSeveridade).toHaveLength(4)
    expect(backlog.data.total).toBe(backlog.data.porSeveridade.reduce((sum: number, row: { total: number }) => sum + row.total, 0))
    expect(top.data[0]).toMatchObject({ equipamentoId: expect.any(String), qtdChamados: expect.any(Number) })
  })

  it('entrega listas vazias para recursos sem registros de demonstração', async () => {
    const response = await apiClient.get('/api-exemplo-sem-dados')

    expect(response.data).toEqual([])
  })
})
