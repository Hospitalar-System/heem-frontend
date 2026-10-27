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

  it('serve categorias, equipamentos com categoria e o fluxo de mesclar', async () => {
    const equipments = (await apiClient.get('/equipamentos')).data as Array<{ categoriaNome: string | null }>
    expect(equipments.some((item) => item.categoriaNome === null)).toBe(true)
    const withoutCategory = (await apiClient.get('/equipamentos', { params: { semCategoria: true } })).data as Array<{ categoriaId: string | null }>
    expect(withoutCategory.length).toBeGreaterThan(0)
    expect(withoutCategory.every((item) => item.categoriaId === null)).toBe(true)

    const review = (await apiClient.get('/categorias-equipamento', { params: { revisar: true } })).data as Array<{ id: string; quantidadeEquipamentos: number }>
    expect(review.length).toBeGreaterThan(0)
    const created = (await apiClient.post('/categorias-equipamento', { nome: 'Bomba', ativa: true, checklistPadraoId: null })).data as { id: string }
    const equipment = (await apiClient.post('/equipamentos', { codigo: 'EQ-D', nome: 'Bomba D', categoriaId: created.id })).data as { id: string; categoriaNome: string }
    expect(equipment.categoriaNome).toBe('Bomba')
    const merged = (await apiClient.post(`/categorias-equipamento/${review[0].id}/mesclar`, { origemId: created.id })).data as { quantidadeEquipamentos: number }
    expect(merged.quantidadeEquipamentos).toBeGreaterThan(0)
    const moved = (await apiClient.get(`/equipamentos/${equipment.id}`)).data as { categoriaId: string }
    expect(moved.categoriaId).toBe(review[0].id)
    const active = (await apiClient.get('/categorias-equipamento', { params: { ativa: true } })).data as Array<{ id: string }>
    expect(active.some((item) => item.id === created.id)).toBe(false)
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

  it('simula a importação em lote com progresso em consultas sucessivas e erros por linha', async () => {
    const form = new FormData()
    form.append('tipo', 'equipamentos')
    form.append('arquivo', new File(['codigo;nome'], 'modelo.csv', { type: 'text/csv' }))
    const started = (await apiClient.post('/importacoes', form)).data as { id: string; status: string; processadas: number }
    expect(started).toEqual(expect.objectContaining({ tipo: 'equipamentos', status: 'pendente', processadas: 0 }))

    const first = (await apiClient.get(`/importacoes/${started.id}`)).data as { status: string; processadas: number; total: number }
    expect(first.status).toBe('processando')
    expect(first.processadas).toBeLessThan(first.total)
    await apiClient.get(`/importacoes/${started.id}`)
    const last = (await apiClient.get(`/importacoes/${started.id}`)).data as { status: string; processadas: number; total: number; comErro: number; erros: Array<{ code: string }> }
    expect(last).toEqual(expect.objectContaining({ status: 'concluido', processadas: last.total }))
    expect(last.comErro).toBe(last.erros.length)
    expect(last.erros.map((error) => error.code)).toContain('CATEGORIA_NAO_ENCONTRADA')
  })
  it('simula a campanha de preventiva: prévia, criação, progresso por consulta e cancelamento', async () => {
    const body = { hospitalId: 'hospital-demo-1', nome: 'Campanha demo', setorIds: [], categoriaIds: [], dataInicio: '2999-01-01', recorrencia: 'avulsa', modoAtribuicao: 'equilibrado' }
    const preview = (await apiClient.post('/campanhas-preventivas/previa', body)).data as { totalEquipamentos: number; aGerar: number; totalPendencias: number; pendenciasPorMotivo: Record<string, number> }
    expect(preview.totalEquipamentos).toBe(2)
    expect(preview.aGerar).toBe(1)
    expect(preview.pendenciasPorMotivo.CATEGORIA_SEM_CHECKLIST).toBe(1)

    const created = (await apiClient.post('/campanhas-preventivas', body)).data as { id: string; status: string }
    expect(created.status).toBe('pendente')
    const list = (await apiClient.get('/campanhas-preventivas', { params: { hospitalId: 'hospital-demo-1' } })).data as Array<{ id: string }>
    expect(list.map((item) => item.id)).toContain(created.id)

    const detail = `/campanhas-preventivas/${created.id}`
    const first = (await apiClient.get(detail)).data as { status: string; execucao: { processadas: number; totalEquipamentos: number } }
    expect(first.status).toBe('processando')
    expect(first.execucao.processadas).toBeLessThan(first.execucao.totalEquipamentos)
    await apiClient.get(detail)
    const done = (await apiClient.get(detail)).data as { status: string; pendenciasDetalhe: unknown[] }
    expect(done.status).toBe('concluida')
    expect(done.pendenciasDetalhe).toHaveLength(1)

    const canceled = (await apiClient.post(`${detail}/cancelar`)).data as { status: string; ativa: boolean }
    expect(canceled).toEqual(expect.objectContaining({ status: 'cancelada', ativa: false }))
  })
})

describe('modo de demonstração: paginação', () => {
  it.each(['/chamados', '/ordens-de-trabalho', '/users', '/hospitais', '/planos-preventivos'])('%s respeita pagina/tamanho e devolve X-Total-Count', async (path) => {
    const all = await apiClient.get(path)
    const total = String((all.data as unknown[]).length)
    expect(all.headers['x-total-count']).toBe(total)
    const first = await apiClient.get(path, { params: { pagina: 0, tamanho: 1 } })
    expect(first.data).toHaveLength(1)
    expect(first.headers['x-total-count']).toBe(total)
    const beyond = await apiClient.get(path, { params: { pagina: 50, tamanho: 10 } })
    expect(beyond.data).toEqual([])
  })

  it('filtra chamados por status e usuários por papel antes de paginar', async () => {
    const none = await apiClient.get('/chamados', { params: { status: 'NAO_EXISTE', pagina: 0, tamanho: 10 } })
    expect(none.data).toEqual([])
    expect(none.headers['x-total-count']).toBe('0')
    const techs = await apiClient.get('/users', { params: { role: 'tecnico', pagina: 0, tamanho: 10 } })
    expect((techs.data as Array<{ role: string }>).every((user) => user.role === 'tecnico')).toBe(true)
  })
})
