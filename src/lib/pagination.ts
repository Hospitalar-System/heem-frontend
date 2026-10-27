import { keepPreviousData, useQuery, type QueryKey } from '@tanstack/react-query'
import { apiClient } from '@/lib/axios'

/** Página devolvida por uma listagem paginada: itens + total geral (header `X-Total-Count`). */
export interface PagedResult<T> {
  items: T[]
  total: number
}

/**
 * Lê o total do header `X-Total-Count`. Sem o header (ou com valor inválido) cai para o
 * tamanho da lista recebida, que é o comportamento de uma API que ainda não pagina.
 */
export function readTotalCount(headers: unknown, fallback: number): number {
  const raw = (headers as Record<string, unknown> | undefined)?.['x-total-count']
  if (raw === undefined || raw === null || raw === '') return fallback
  const value = Number(raw)
  return Number.isFinite(value) && value >= 0 ? value : fallback
}

/** GET de uma listagem paginada do backend; descarta parâmetros indefinidos ou vazios. */
export async function fetchPaged<T>(path: string, params: Record<string, unknown>): Promise<PagedResult<T>> {
  const clean = Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== ''))
  const response = await apiClient.get<T[]>(path, { params: clean })
  return { items: response.data, total: readTotalCount(response.headers, response.data.length) }
}

/**
 * `useQuery` de listagem paginada. `keepPreviousData` mantém a página anterior na tela
 * enquanto a próxima carrega, sem piscar o esqueleto a cada troca de página.
 */
export function usePagedQuery<T>(queryKey: QueryKey, path: string, params: Record<string, unknown>) {
  return useQuery({
    queryKey: [...queryKey, params],
    queryFn: () => fetchPaged<T>(path, params),
    placeholderData: keepPreviousData,
  })
}
