import type { CSSProperties, PropsWithChildren } from 'react'
import { useRevelar } from '../hooks/useRevelar'

export type VarianteReveal = 'up' | 'left' | 'right' | 'scale'

interface RevealProps {
  className?: string
  /** Atraso da transição em ms (para escalonar cartões). */
  delay?: number
  variant?: VarianteReveal
}

/**
 * Revela o conteúdo ao entrar na tela (IntersectionObserver). O conteúdo só é escondido (`pending`) depois
 * que o observador está ativo; sem IntersectionObserver ou com prefers-reduced-motion nenhum atributo é
 * aplicado e o conteúdo fica sempre visível.
 */
export function Reveal({ children, className, delay = 0, variant = 'up' }: PropsWithChildren<RevealProps>) {
  const [ref, fase] = useRevelar<HTMLDivElement>()
  const armado = fase !== 'off'
  return (
    <div
      ref={ref}
      className={className}
      data-reveal={armado ? fase : undefined}
      data-reveal-variant={armado ? variant : undefined}
      style={armado ? ({ '--reveal-delay': `${delay}ms` } as CSSProperties) : undefined}
    >
      {children}
    </div>
  )
}
