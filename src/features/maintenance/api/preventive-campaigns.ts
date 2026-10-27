import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useCategories } from '@/features/assets/api/categories'
import { useHospitals, useSectors } from '@/features/assets/api/assets'
import { useTenantUsers, useUserHospitalLinks } from '@/features/tenants-users/api/users'
import { apiClient } from '@/lib/axios'
import type { Campaign, CampaignCreated, CampaignFilters, CampaignInput, CampaignPreview } from '../types/campaigns'

export const campaignsKey = ['preventive-campaigns'] as const

/** Execução em andamento: a campanha ainda está sendo processada em segundo plano. */
export const isCampaignRunning = (campaign?: Pick<Campaign, 'status'>) => campaign?.status === 'pendente' || campaign?.status === 'processando'

export const CAMPAIGN_POLL_MS = 2000
/** Teto do polling (~10 min): depois disso o painel para de consultar sozinho e oferece atualização manual. */
export const CAMPAIGN_POLL_MAX_UPDATES = 300

export function useCampaigns(filters: CampaignFilters) {
  return useQuery({
    queryKey: [...campaignsKey, 'list', filters],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (filters.hospitalId) params.hospitalId = filters.hospitalId
      if (filters.status) params.status = filters.status
      return (await apiClient.get<Campaign[]>('/campanhas-preventivas', { params })).data
    },
  })
}

/** Painel da campanha; consulta de novo a cada 2 s enquanto a execução está em andamento (e para ao concluir/falhar). */
export function useCampaign(id: string) {
  const client = useQueryClient()
  const queryKey = [...campaignsKey, 'detail', id]
  const query = useQuery({
    queryKey,
    queryFn: async () => (await apiClient.get<Campaign>(`/campanhas-preventivas/${id}`)).data,
    enabled: Boolean(id),
    refetchInterval: (state) => isCampaignRunning(state.state.data) && state.state.dataUpdateCount < CAMPAIGN_POLL_MAX_UPDATES ? CAMPAIGN_POLL_MS : false,
  })
  const pollStopped = isCampaignRunning(query.data) && (client.getQueryState(queryKey)?.dataUpdateCount ?? 0) >= CAMPAIGN_POLL_MAX_UPDATES
  return { ...query, pollStopped }
}

export function useCampaignPreview() {
  return useMutation({
    mutationFn: async (input: CampaignInput) => (await apiClient.post<CampaignPreview>('/campanhas-preventivas/previa', input)).data,
  })
}

export function useCreateCampaign() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (input: CampaignInput) => (await apiClient.post<CampaignCreated>('/campanhas-preventivas', input)).data,
    onSuccess: () => client.invalidateQueries({ queryKey: campaignsKey }),
  })
}

/** Idempotente no backend; não cancela as OTs já geradas. */
export function useCancelCampaign() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => (await apiClient.post<Campaign>(`/campanhas-preventivas/${id}/cancelar`)).data,
    onSuccess: (campaign, id) => {
      client.setQueryData([...campaignsKey, 'detail', id], campaign)
      return client.invalidateQueries({ queryKey: [...campaignsKey, 'list'] })
    },
  })
}

/** Dados auxiliares do formulário: hospitais, setores/categorias e técnicos ativos vinculados ao hospital escolhido. */
export function useCampaignLookups(hospitalId: string) {
  const hospitals = useHospitals()
  const sectors = useSectors(hospitalId)
  const categories = useCategories({ ativa: true })
  const users = useTenantUsers()
  const links = useUserHospitalLinks(users.data ?? [])
  const technicians = useMemo(() => (users.data ?? []).flatMap((user, index) => {
    const linked = links[index]?.data
    return user.role === 'tecnico' && user.ativo && hospitalId && linked?.includes(hospitalId) ? [{ id: user.id, nome: user.nome }] : []
  }), [hospitalId, links, users.data])
  return {
    hospitals: hospitals.data ?? [],
    sectors: sectors.data ?? [],
    categories: categories.data ?? [],
    technicians,
    isLoading: hospitals.isLoading,
    isError: hospitals.isError || sectors.isError || categories.isError || users.isError,
    sectorsLoading: Boolean(hospitalId) && sectors.isLoading,
    techniciansLoading: users.isLoading || links.some((query) => query.isLoading),
  }
}
