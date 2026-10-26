/** Comportamento padrão enquanto não há formulário (L3): rola até a chamada final, sem animação com reduced motion. */
export function rolarParaContato() {
  const alvo = document.getElementById('contato')
  if (!alvo) return
  const reduzido = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  alvo.scrollIntoView?.({ behavior: reduzido ? 'auto' : 'smooth', block: 'start' })
}
