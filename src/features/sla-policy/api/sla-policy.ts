import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/axios'
import { orderSlaPolicy, slaPolicyResponseSchema, slaPolicyUpdateSchema } from '../types'
import type { SlaPolicyUpdateEntry } from '../types'

export const slaPolicyKey = ['sla-policy'] as const

export function useSlaPolicy() {
  return useQuery({
    queryKey: slaPolicyKey,
    queryFn: async () => orderSlaPolicy(slaPolicyResponseSchema.parse((await apiClient.get<unknown>('/sla/politica')).data)),
  })
}

export function useSaveSlaPolicy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (entries: SlaPolicyUpdateEntry[]) => {
      const request = slaPolicyUpdateSchema.parse(entries)
      const response = slaPolicyResponseSchema.parse((await apiClient.put<unknown>('/sla/politica', request)).data)
      return orderSlaPolicy(response)
    },
    onSuccess: (policy) => queryClient.setQueryData(slaPolicyKey, policy),
  })
}
