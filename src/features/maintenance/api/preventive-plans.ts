import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useEquipments, useHospitals, useSectorsForHospitals } from '@/features/assets/api/assets'
import { useTenantUsers, useUserHospitalLinks } from '@/features/tenants-users/api/users'
import { apiClient } from '@/lib/axios'
import { usePagedQuery } from '@/lib/pagination'
import type { CreatePreventivePlanInput, PreventivePlan, PreventivePlanFilters, PreventivePlanPage, UpdatePreventivePlanInput } from '../types'
import { useChecklists } from './work-orders'

export const preventivePlansKey = ['preventive-plans'] as const

export function usePreventivePlans(filters: PreventivePlanFilters, enabled = true) {
  // O total vem em X-Total-Count; sem o header, cai para o tamanho da página recebida (ver lib/pagination).
  return usePagedQuery<PreventivePlan>(preventivePlansKey, '/planos-preventivos', { ...filters }, enabled)
}

/** Um plano (nome da rotina no chip da lista de OTs). */
export function usePreventivePlan(id: string) {
  return useQuery({
    queryKey: [...preventivePlansKey, 'detail', id],
    queryFn: async () => (await apiClient.get<PreventivePlan>(`/planos-preventivos/${id}`)).data,
    enabled: Boolean(id),
  })
}

export function useCreatePreventivePlan() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreatePreventivePlanInput) =>
      (await apiClient.post<PreventivePlan>('/planos-preventivos', input)).data,
    onSuccess: () => client.invalidateQueries({ queryKey: preventivePlansKey }),
  })
}

export function useUpdatePreventivePlan() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdatePreventivePlanInput & { id: string }) =>
      (await apiClient.put<PreventivePlan>(`/planos-preventivos/${id}`, input)).data,
    onSuccess: () => client.invalidateQueries({ queryKey: preventivePlansKey }),
  })
}

/** Desativar preserva o histórico e as OTs já geradas (não há DELETE nem reativação no contrato). */
export function useDeactivatePreventivePlan() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => (await apiClient.post<PreventivePlan>(`/planos-preventivos/${id}/desativar`)).data,
    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: preventivePlansKey })
      const previous = client.getQueriesData<PreventivePlanPage>({ queryKey: preventivePlansKey })
      client.setQueriesData<PreventivePlanPage>({ queryKey: preventivePlansKey }, (page) => page && {
        ...page,
        items: page.items.map((plan) => plan.id === id ? { ...plan, ativo: false } : plan),
      })
      return { previous }
    },
    onError: (_error, _id, context) => context?.previous.forEach(([key, data]) => client.setQueryData(key, data)),
    onSettled: () => client.invalidateQueries({ queryKey: preventivePlansKey }),
  })
}

/**
 * Dados auxiliares do módulo (equipamentos, checklists, técnicos): reaproveita os hooks das outras telas.
 * `technicians` lista os técnicos ativos com um item por hospital vinculado.
 */
export function usePlanLookups() {
  const equipment = useEquipments()
  const hospitals = useHospitals()
  const sectors = useSectorsForHospitals(hospitals.data?.map(({ id }) => id) ?? [])
  const users = useTenantUsers()
  const hospitalLinks = useUserHospitalLinks(users.data ?? [])
  const checklists = useChecklists()
  const technicians = useMemo(() => (users.data ?? []).flatMap((user, index) => {
    const links = hospitalLinks[index]?.data
    return user.role === 'tecnico' && user.ativo && links
      ? links.map((hospitalId) => ({ id: user.id, nome: user.nome, hospitalId }))
      : []
  }), [hospitalLinks, users.data])
  const hospitalOfEquipment = useMemo(() => {
    const sectorHospital = new Map((sectors.data ?? []).map((sector) => [sector.id, sector.hospitalId]))
    return (equipmentId: string) => {
      const item = (equipment.data ?? []).find(({ id }) => id === equipmentId)
      return item ? sectorHospital.get(item.setorId) : undefined
    }
  }, [equipment.data, sectors.data])
  return {
    equipment: equipment.data ?? [],
    checklists: checklists.data ?? [],
    users: users.data ?? [],
    technicians,
    hospitalOfEquipment,
    isLoading: equipment.isLoading || checklists.isLoading || users.isLoading || sectors.isLoading || hospitalLinks.some((query) => query.isLoading),
    isError: equipment.isError || checklists.isError || users.isError || sectors.isError || hospitals.isError,
  }
}
