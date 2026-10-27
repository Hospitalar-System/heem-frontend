import { useMemo, useState } from 'react'

export const reportGlossary = [
  { term: 'MTTA', text: 'Tempo médio de atendimento: da abertura do chamado até a primeira resposta.' },
  { term: 'MTTR', text: 'Tempo médio de resolução: da abertura do chamado até o chamado ser resolvido.' },
  { term: 'MTBF', text: 'Tempo médio entre falhas: intervalo médio entre aberturas de chamados do mesmo equipamento.' },
  { term: 'Triagem', text: 'Da abertura até o chamado entrar em andamento.' },
  { term: 'Espera de peça', text: 'Tempo médio em "aguardando peça", entre os chamados que passaram por esse estado.' },
]

export function formatMetric(value: number | null | undefined, suffix = '') {
  return value == null ? '—' : `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}${suffix}`
}

export function formatHours(value: number | null | undefined) {
  return formatMetric(value, ' h')
}

export function formatPercent(value: number | null | undefined) {
  return formatMetric(value, '%')
}

export function formatCount(value: number | null | undefined) {
  return value == null ? '—' : value.toLocaleString('pt-BR')
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: string; code?: string } } }).response
    return response?.data?.detail || response?.data?.code || fallback
  }
  return error instanceof Error ? error.message : fallback
}

export type SortDirection = 'asc' | 'desc'

export function useSortedRows<T, K extends string>(rows: readonly T[], getValue: (row: T, key: K) => string | number | null, initial: { key: K; direction: SortDirection }) {
  const [sort, setSort] = useState(initial)
  const sorted = useMemo(() => [...rows].sort((a, b) => {
    const left = getValue(a, sort.key)
    const right = getValue(b, sort.key)
    // Valores ausentes (null) ficam sempre no fim, em qualquer direção.
    if (left == null && right == null) return 0
    if (left == null) return 1
    if (right == null) return -1
    const order = typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right), 'pt-BR')
    return sort.direction === 'asc' ? order : -order
  }), [rows, sort, getValue])
  function toggle(key: K) {
    setSort((current) => current.key === key ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: key === initial.key ? initial.direction : 'desc' })
  }
  return { sorted, sort, toggle }
}

