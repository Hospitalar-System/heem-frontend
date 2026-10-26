import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

/** Abas com ativação automática e foco circular por ←/→ (Home/End vão ao primeiro/último). */
export function useTabs(count: number) {
  const [index, setIndex] = useState(0)
  const refs = useRef<(HTMLElement | null)[]>([])

  function select(next: number, focus = false) {
    setIndex(next)
    if (focus) refs.current[next]?.focus()
  }

  function onKeyDown(event: KeyboardEvent, current: number) {
    let next: number | null = null
    if (event.key === 'ArrowRight') next = (current + 1) % count
    else if (event.key === 'ArrowLeft') next = (current - 1 + count) % count
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = count - 1
    if (next === null) return
    event.preventDefault()
    select(next, true)
  }

  return { index, select, onKeyDown, refs }
}
