import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { DataTableSort } from '@/components/ui/DataTable'

/**
 * Ordenação na query string (`?ordenar=nome&direcao=desc`), no mesmo estilo de `pagina`/`tamanho`.
 * Só aceita campos de `allowed`; qualquer outro valor é ignorado. Trocar a ordenação volta para a página 1.
 * Ciclo por cabeçalho: nova coluna ascendente, depois descendente e, no terceiro clique, sem ordenação.
 */
export function useSortParams<K extends string>(allowed: readonly K[]) {
  const [searchParams, setSearchParams] = useSearchParams()
  const raw = searchParams.get('ordenar')
  const key = (allowed as readonly string[]).includes(raw ?? '') ? (raw as K) : null
  const direction = searchParams.get('direcao') === 'desc' ? 'desc' : 'asc'
  const sort: DataTableSort | null = key ? { key, direction } : null

  const onSortChange = useCallback((next: string) => {
    if (!(allowed as readonly string[]).includes(next)) return
    setSearchParams((current) => {
      const params = new URLSearchParams(current)
      const currentKey = params.get('ordenar')
      const currentDirection = params.get('direcao') === 'desc' ? 'desc' : 'asc'
      params.delete('pagina')
      if (currentKey !== next) { params.set('ordenar', next); params.delete('direcao') }
      else if (currentDirection === 'asc') params.set('direcao', 'desc')
      else { params.delete('ordenar'); params.delete('direcao') }
      return params
    })
  }, [allowed, setSearchParams])

  const apiParams: { ordenar?: K; direcao?: 'asc' | 'desc' } = key ? { ordenar: key, direcao: direction } : {}
  return { sort, apiParams, onSortChange }
}
