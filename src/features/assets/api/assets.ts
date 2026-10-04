import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/axios'
import type { Hospital, HospitalInput, Setor, SetorInput } from '../types'

const hospitalKey = ['hospitals'] as const
export function useHospitals() { return useQuery({ queryKey: hospitalKey, queryFn: async () => (await apiClient.get<Hospital[]>('/hospitais')).data }) }
export function useHospital(id: string) { return useQuery({ queryKey: [...hospitalKey, id], queryFn: async () => (await apiClient.get<Hospital>(`/hospitais/${id}`)).data, enabled: Boolean(id) }) }
export function useSaveHospital() {
  const client = useQueryClient()
  return useMutation({ mutationFn: async ({ id, data }: { id?: string; data: HospitalInput }) => id ? (await apiClient.put<Hospital>(`/hospitais/${id}`, data)).data : (await apiClient.post<Hospital>('/hospitais', data)).data, onSuccess: () => client.invalidateQueries({ queryKey: hospitalKey }) })
}
export function useSectors(hospitalId: string) { return useQuery({ queryKey: ['sectors', hospitalId], queryFn: async () => (await apiClient.get<Setor[]>(`/hospitais/${hospitalId}/setores`)).data, enabled: Boolean(hospitalId) }) }
export function useSector(id: string) { return useQuery({ queryKey: ['sector', id], queryFn: async () => (await apiClient.get<Setor>(`/setores/${id}`)).data, enabled: Boolean(id) }) }
export function useSaveSector() {
  const client = useQueryClient()
  return useMutation({ mutationFn: async ({ id, hospitalId, data }: { id?: string; hospitalId: string; data: SetorInput }) => id ? (await apiClient.put<Setor>(`/setores/${id}`, data)).data : (await apiClient.post<Setor>(`/hospitais/${hospitalId}/setores`, data)).data, onSuccess: (_data, variables) => { client.invalidateQueries({ queryKey: ['sectors', variables.hospitalId] }); client.invalidateQueries({ queryKey: ['hospital-metrics'] }) } })
}
