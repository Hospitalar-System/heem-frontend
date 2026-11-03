import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { PaginationParams } from './usePaginationParams'

export const SEARCH_DEBOUNCE_MS = 300

/**
 * Busca textual no servidor: o campo (`input`) é imediato; o termo enviado (`term`, parâmetro `q` da URL)
 * só muda após o debounce, e então a página volta para a 1. `clear` zera o campo (a URL segue o debounce
 * ou o `setFilters` de quem limpa os filtros).
 */
export function useServerSearch(pagination: Pick<PaginationParams, 'setFilters'>) {
  const [searchParams] = useSearchParams()
  const term = searchParams.get('q') ?? ''
  const [input, setInput] = useState(term)
  const setFilters = useRef(pagination.setFilters)
  setFilters.current = pagination.setFilters

  useEffect(() => {
    const next = input.trim()
    if (next === term) return
    const timer = setTimeout(() => setFilters.current({ q: next || undefined }), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [input, term])

  const clear = () => setInput('')
  return { input, setInput, term: term || undefined, clear }
}
