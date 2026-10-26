import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, PropsWithChildren } from 'react'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

interface RevealProps {
  className?: string
  /** Atraso da transição em ms (para escalonar cartões). */
  delay?: number
  variant?: 'up' | 'scale'
}

/**
 * Revela o conteúdo ao entrar na tela (IntersectionObserver). Sem IntersectionObserver ou com
 * prefers-reduced-motion nenhum atributo é aplicado e o conteúdo fica sempre visível.
 */
export function Reveal({ children, className, delay = 0, variant = 'up' }: PropsWithChildren<RevealProps>) {
  const reduced = usePrefersReducedMotion()
  const armed = !reduced && typeof IntersectionObserver !== 'undefined'
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!armed || !el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true)
          observer.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [armed])

  if (!armed) return <div className={className}>{children}</div>
  return (
    <div
      ref={ref}
      className={className}
      data-reveal={shown ? 'in' : 'pending'}
      data-reveal-variant={variant}
      style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  )
}
