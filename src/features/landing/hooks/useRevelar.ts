import { useLayoutEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

/** `off`: sem observador (conteúdo sempre visível); `pending`: observando, ainda fora da tela; `in`: já entrou. */
export type FaseRevelacao = 'off' | 'pending' | 'in'

const OPCOES: IntersectionObserverInit = { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }

/**
 * Observa o elemento (uma única vez) e informa quando ele entra na tela. Como na referência (classe `rv`
 * na raiz), a fase `pending` — a que esconde o conteúdo — só existe depois que o observador está ativo;
 * sem IntersectionObserver, com falha ao criá-lo ou com prefers-reduced-motion a fase é `off`.
 * Elementos montados depois (abas, painéis) têm o próprio observador e disparam ao ficar visíveis.
 */
export function useRevelar<T extends Element>() {
  const reduzido = usePrefersReducedMotion()
  const ref = useRef<T>(null)
  const [fase, setFase] = useState<FaseRevelacao>('off')

  useLayoutEffect(() => {
    const el = ref.current
    if (reduzido || !el || typeof IntersectionObserver === 'undefined') {
      setFase((atual) => (atual === 'in' ? atual : 'off'))
      return
    }
    let observador: IntersectionObserver
    try {
      observador = new IntersectionObserver((entradas) => {
        if (entradas.some((entrada) => entrada.isIntersecting)) {
          setFase('in')
          observador.disconnect()
        }
      }, OPCOES)
      observador.observe(el)
    } catch {
      setFase('off')
      return
    }
    setFase((atual) => (atual === 'in' ? atual : 'pending'))
    return () => observador.disconnect()
  }, [reduzido])

  return [ref, fase] as const
}
