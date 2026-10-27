export type PageItem = number | 'gap-start' | 'gap-end'

/** Até 7 posições: primeira, última, a atual e suas vizinhas, com reticências no meio. */
export function pageItems(page: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1)
  if (page <= 4) return [1, 2, 3, 4, 5, 'gap-end', totalPages]
  if (page >= totalPages - 3) return [1, 'gap-start', ...Array.from({ length: 5 }, (_, index) => totalPages - 4 + index)]
  return [1, 'gap-start', page - 1, page, page + 1, 'gap-end', totalPages]
}
