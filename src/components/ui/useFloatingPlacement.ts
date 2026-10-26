import { useCallback, useLayoutEffect, useState, type RefObject } from 'react'

export type Placement = { left: number; width: number; top?: number; bottom?: number; maxHeight: number }

const GAP = 6
const MARGIN = 8

/**
 * Posição fixa (viewport) para um popover ancorado: abre para baixo e, se faltar espaço
 * e houver mais acima, abre para cima. Recalcula em scroll (qualquer ancestral) e resize.
 */
export function useFloatingPlacement(open: boolean, anchorRef: RefObject<HTMLElement | null>, wantedHeight: number, cap = 256, floor = 96, popoverWidth?: number) {
  const [placement, setPlacement] = useState<Placement | null>(null)

  const measure = useCallback(() => {
    const anchor = anchorRef.current
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    const below = window.innerHeight - rect.bottom - GAP - MARGIN
    const above = rect.top - GAP - MARGIN
    const openUp = below < wantedHeight && above > below
    const maxHeight = Math.max(floor, Math.min(cap, openUp ? above : below))
    const left = popoverWidth ? Math.max(MARGIN, Math.min(rect.left, window.innerWidth - popoverWidth - MARGIN)) : rect.left
    setPlacement(openUp
      ? { left, width: rect.width, bottom: window.innerHeight - rect.top + GAP, maxHeight }
      : { left, width: rect.width, top: rect.bottom + GAP, maxHeight })
  }, [anchorRef, wantedHeight, cap, floor, popoverWidth])

  useLayoutEffect(() => {
    if (!open) return
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => { window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true) }
  }, [open, measure])

  return placement
}
