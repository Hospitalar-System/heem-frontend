import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

/** Barra de progresso de rolagem no topo da landing. Não é renderizada com prefers-reduced-motion. */
export function ScrollProgress() {
  const reduced = usePrefersReducedMotion()
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (reduced) return
    let frame = 0
    const update = () => {
      frame = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
      if (barRef.current) barRef.current.style.transform = `scaleX(${ratio})`
    }
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [reduced])

  if (reduced) return null
  return (
    <div
      ref={barRef}
      data-testid="scroll-progress"
      aria-hidden="true"
      className="landing-progress pointer-events-none fixed left-0 top-0 z-[100] h-[3px] w-full bg-primary"
    />
  )
}
