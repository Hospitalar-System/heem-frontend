import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/axios'
import type { PlatformUser, PlatformUserInput } from '../types'

const platformUsersKey = ['platform-users'] as const

export function usePlatformUsers() {
  return useQuery({ queryKey: platformUsersKey, queryFn: async () => (await apiClient.get<PlatformUser[]>('/platform-users')).data })
}

export function usePlatformUser(id: string) {
  return useQuery({ queryKey: [...platformUsersKey, id], queryFn: async () => (await apiClient.get<PlatformUser>(`/platform-users/${id}`)).data, enabled: Boolean(id) })
}

export function useSavePlatformUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: PlatformUserInput }) => id
      ? (await apiClient.put<PlatformUser>(`/platform-users/${id}`, data)).data
      : (await apiClient.post<PlatformUser>('/platform-users', data)).data,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: platformUsersKey })
      if (variables.id) queryClient.invalidateQueries({ queryKey: [...platformUsersKey, variables.id] })
    },
  })
}

export function useDeactivatePlatformUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => apiClient.post(`/platform-users/${id}/desativar`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformUsersKey }),
  })
}
