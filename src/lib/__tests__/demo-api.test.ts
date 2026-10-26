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

  it('simula listar, criar, editar e desativar planos preventivos', async () => {
    const listed = await apiClient.get('/planos-preventivos', { params: { ativo: true } })
    expect(listed.data.length).toBeGreaterThanOrEqual(2)
    expect(listed.data[0]).toEqual(expect.objectContaining({ equipamentoId: expect.any(String), intervaloDias: expect.any(Number), proximaData: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), ativo: true, pendencia: expect.any(Boolean) }))

    const created = await apiClient.post('/planos-preventivos', { equipamentoId: 'equipment-demo-3', checklistId: 'checklist-demo-1', tecnicoPadraoId: 'user-demo-2', intervaloDias: 15, dataAncora: '2999-01-10' })
    expect(created.data).toEqual(expect.objectContaining({ ativo: true, pendencia: false, proximaData: '2999-01-10' }))

    const updated = await apiClient.put(`/planos-preventivos/${created.data.id}`, { tecnicoPadraoId: 'user-demo-2', intervaloDias: 20, dataAncora: '2999-02-01' })
    expect(updated.data).toEqual(expect.objectContaining({ intervaloDias: 20, proximaData: '2999-02-01' }))

    const deactivated = await apiClient.post(`/planos-preventivos/${created.data.id}/desativar`)
    expect(deactivated.data.ativo).toBe(false)
    const inactive = await apiClient.get('/planos-preventivos', { params: { ativo: false } })
    expect(inactive.data.map((plan: { id: string }) => plan.id)).toContain(created.data.id)
  })
})
