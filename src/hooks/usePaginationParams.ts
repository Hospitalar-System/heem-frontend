import { useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

export const PAGE_SIZES = [10, 25, 50] as const
export type PageSize = (typeof PAGE_SIZES)[number]
export const DEFAULT_PAGE_SIZE: PageSize = 25

function parsePage(raw: string | null) {
  const value = Number(raw)
  return Number.isInteger(value) && value >= 1 ? value : 1
}

function parseSize(raw: string | null): PageSize {
  const value = Number(raw)
  return (PAGE_SIZES as readonly number[]).includes(value) ? (value as PageSize) : DEFAULT_PAGE_SIZE
}

export interface PaginationParams {
  /** Página atual, 1-based (o que aparece na URL). */
  page: number
  size: PageSize
  /** Parâmetros do backend: `pagina` é 0-based (contrato de `Paginacao`). */
  apiParams: { pagina: number; tamanho: number }
  setPage: (page: number, options?: { replace?: boolean }) => void
  setSize: (size: number) => void
  /** Volta para a página 1 mantendo os demais parâmetros. */
  resetPage: () => void
  /**
   * Altera filtros da URL (valor vazio/undefined remove o parâmetro) e volta para a página 1.
   * Demais parâmetros e o tamanho escolhido são preservados.
   */
  setFilters: (patch: Record<string, string | undefined>) => void
}

/**
 * Página e tamanho na query string (`?pagina=2&tamanho=50`), preservando os demais filtros da URL.
 * Valores inválidos caem no padrão (página 1, 25 itens). Página 1 e tamanho padrão não poluem a URL.
 */
export function usePaginationParams(): PaginationParams {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = parsePage(searchParams.get('pagina'))
  const size = parseSize(searchParams.get('tamanho'))

  const update = useCallback((mutate: (next: URLSearchParams) => void, replace = false) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      mutate(next)
      return next
    }, { replace })
  }, [setSearchParams])

  const writePage = (next: URLSearchParams, value: number) => {
    if (value <= 1) next.delete('pagina')
    else next.set('pagina', String(value))
  }

  const setPage = useCallback((value: number, options?: { replace?: boolean }) => {
    update((next) => writePage(next, Math.max(1, Math.floor(value))), options?.replace)
  }, [update])

  const setSize = useCallback((value: number) => {
    update((next) => {
      if (value === DEFAULT_PAGE_SIZE || !(PAGE_SIZES as readonly number[]).includes(value)) next.delete('tamanho')
      else next.set('tamanho', String(value))
      next.delete('pagina')
    })
  }, [update])

  const resetPage = useCallback(() => update((next) => next.delete('pagina')), [update])

  const setFilters = useCallback((patch: Record<string, string | undefined>) => {
    update((next) => {
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === '') next.delete(key)
        else next.set(key, value)
      }
      next.delete('pagina')
    })
  }, [update])

  return { page, size, apiParams: { pagina: page - 1, tamanho: size }, setPage, setSize, resetPage, setFilters }
}

/**
 * Se a página da URL ficou além da última (ex.: depois de desativar o último item da página),
 * volta para a última página válida. `ready` deve ser falso enquanto o total vem de dados antigos.
 */
export function usePageClamp(pagination: Pick<PaginationParams, 'page' | 'size' | 'setPage'>, total: number | undefined, ready = true) {
  const { page, size, setPage } = pagination
  useEffect(() => {
    if (!ready || total === undefined) return
    const lastPage = Math.max(1, Math.ceil(total / size))
    if (page > lastPage) setPage(lastPage, { replace: true })
  }, [page, ready, setPage, size, total])
}
