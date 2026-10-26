import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/axios'
import type { EquipmentCategory, EquipmentCategoryInput } from '../types'

export interface CategoryFilters { ativa?: boolean; revisar?: boolean }

const categoryKey = ['categories'] as const

export function useCategories(filters: CategoryFilters = {}) {
  const params = {
    ...(filters.ativa === undefined ? {} : { ativa: filters.ativa }),
    ...(filters.revisar ? { revisar: true } : {}),
  }
  return useQuery({
    queryKey: [...categoryKey, params],
    queryFn: async () => (await apiClient.get<EquipmentCategory[]>('/categorias-equipamento', { params })).data,
  })
}

function useInvalidateCategories() {
  const client = useQueryClient()
  return () => {
    void client.invalidateQueries({ queryKey: categoryKey })
    void client.invalidateQueries({ queryKey: ['equipments'] })
    void client.invalidateQueries({ queryKey: ['equipment'] })
  }
}

export function useSaveCategory() {
  const invalidate = useInvalidateCategories()
  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: EquipmentCategoryInput }) => id
      ? (await apiClient.put<EquipmentCategory>(`/categorias-equipamento/${id}`, data)).data
      : (await apiClient.post<EquipmentCategory>('/categorias-equipamento', data)).data,
    onSuccess: invalidate,
  })
}

export function useDeactivateCategory() {
  const invalidate = useInvalidateCategories()
  return useMutation({
    mutationFn: async (id: string) => { await apiClient.delete(`/categorias-equipamento/${id}`) },
    onSuccess: invalidate,
  })
}

export function useMarkCategoryReviewed() {
  const invalidate = useInvalidateCategories()
  return useMutation({
    mutationFn: async (id: string) => (await apiClient.put<EquipmentCategory>(`/categorias-equipamento/${id}/revisada`)).data,
    onSuccess: invalidate,
  })
}

/** O `destinoId` é o {id} da rota; a origem segue no corpo. */
export function useMergeCategory() {
  const invalidate = useInvalidateCategories()
  return useMutation({
    mutationFn: async ({ destinoId, origemId }: { destinoId: string; origemId: string }) =>
      (await apiClient.post<EquipmentCategory>(`/categorias-equipamento/${destinoId}/mesclar`, { origemId })).data,
    onSuccess: invalidate,
  })
}

const errorMessages: Record<string, string> = {
  CATEGORIA_DUPLICADA: 'Já existe uma categoria com este nome. Maiúsculas, acentos e espaços extras são ignorados na comparação.',
  CHECKLIST_INVALIDO: 'O checklist escolhido não está disponível para este cliente.',
  MESCLAGEM_INVALIDA: 'Não é possível mesclar: escolha uma categoria de origem diferente do destino.',
  NOME_INVALIDO: 'Informe um nome válido para a categoria.',
  CATEGORIA_OBRIGATORIA: 'Selecione a categoria do equipamento.',
  CATEGORIA_INVALIDA: 'A categoria escolhida não existe ou está desativada. Selecione outra categoria.',
}

export function getErrorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const data = (error as { response?: { data?: { code?: string } } }).response?.data
    return data?.code
  }
  return undefined
}

/** Mensagem pt-BR por `code` do backend; devolve `undefined` quando o código não é de categoria. */
export function getCategoryErrorMessage(error: unknown): string | undefined {
  const code = getErrorCode(error)
  if (code && errorMessages[code]) return errorMessages[code]
  if (typeof error === 'object' && error !== null && 'response' in error && (error as { response?: { status?: number } }).response?.status === 404) {
    return 'Categoria não encontrada. Atualize a lista e tente novamente.'
  }
  return undefined
}
