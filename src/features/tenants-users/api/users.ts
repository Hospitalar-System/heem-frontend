import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/axios'
import type { Hospital } from '@/features/assets/types'
import type { TenantUser, TenantUserInput } from '../types'

const key = ['tenant-users'] as const
export function useTenantUsers() { return useQuery({ queryKey: key, queryFn: async () => (await apiClient.get<TenantUser[]>('/users')).data }) }
export function useTenantUser(id: string) { return useQuery({ queryKey: [...key, id], queryFn: async () => (await apiClient.get<TenantUser>(`/users/${id}`)).data, enabled: Boolean(id) }) }
export function useUserHospitals(userId: string) { return useQuery({ queryKey: [...key, userId, 'hospitals'], queryFn: async () => (await apiClient.get<string[]>(`/users/${userId}/hospitais`)).data, enabled: Boolean(userId) }) }
export function useUserHospitalLinks(users: TenantUser[]) {
  return useQueries({ queries: users.map((user) => ({ queryKey: [...key, user.id, 'hospitals'], queryFn: async () => (await apiClient.get<string[]>(`/users/${user.id}/hospitais`)).data })) })
}
export function useHospitalChoices() { return useQuery({ queryKey: ['hospitals'], queryFn: async () => (await apiClient.get<Hospital[]>('/hospitais')).data }) }
export function useSaveTenantUser() {
  const client = useQueryClient()
  return useMutation({ mutationFn: async ({ id, data }: { id?: string; data: TenantUserInput }) => id ? (await apiClient.put<TenantUser>(`/users/${id}`, { nome: data.nome, email: data.email, role: data.role })).data : (await apiClient.post<TenantUser>('/users', data)).data, onSuccess: () => client.invalidateQueries({ queryKey: key }) })
}
export function useSetUserHospitals() {
  const client = useQueryClient()
  return useMutation({ mutationFn: async ({ userId, hospitalId, attach }: { userId: string; hospitalId: string; attach: boolean }) => attach ? apiClient.post(`/users/${userId}/hospitais/${hospitalId}`) : apiClient.delete(`/users/${userId}/hospitais/${hospitalId}`), onSuccess: (_data, vars) => { client.invalidateQueries({ queryKey: [...key, vars.userId, 'hospitals'] }); client.invalidateQueries({ queryKey: key }) } })
}
export function useDeactivateUser() {
  const client = useQueryClient()
  return useMutation({ mutationFn: async (id: string) => apiClient.post(`/users/${id}/desativar`), onSuccess: () => client.invalidateQueries({ queryKey: key }) })
}
