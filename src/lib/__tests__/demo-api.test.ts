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

  it('entrega listas vazias para recursos sem registros de demonstração', async () => {
    const response = await apiClient.get('/api-exemplo-sem-dados')

    expect(response.data).toEqual([])
  })
})
