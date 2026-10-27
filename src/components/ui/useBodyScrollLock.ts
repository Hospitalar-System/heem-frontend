import { useEffect } from 'react'

let locks = 0
let previousOverflow = ''

/** Trava o scroll do documento enquanto `active` (modal ou drawer aberto). Suporta travas aninhadas. */
export function useBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active) return
    if (locks === 0) {
      previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    locks += 1
    return () => {
      locks -= 1
      if (locks === 0) document.body.style.overflow = previousOverflow
    }
  }, [active])
}
