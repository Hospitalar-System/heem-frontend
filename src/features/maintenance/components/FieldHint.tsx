import { HelpCircle } from 'lucide-react'
import { useId, useState, type KeyboardEvent, type ReactNode } from 'react'

/**
 * Ajuda de campo em tooltip: um ícone ao lado do rótulo em vez de texto embaixo do campo, para a explicação
 * não empurrar o campo e desalinhar a linha da grade. Abre com hover, foco ou toque e fecha com Esc ou ao sair.
 * O botão aponta para o tooltip por `aria-describedby`; o texto fica no DOM mesmo fechado (leitores de tela leem).
 * Coloque dentro de um contêiner `relative` na linha do rótulo.
 */
export function FieldHint({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  const tipId = useId()
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [pinned, setPinned] = useState(false)
  const open = hovered || focused || pinned

  function onKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Escape' || !open) return
    // Fecha só a dica, sem fechar o modal ou a página em volta.
    event.stopPropagation()
    setHovered(false)
    setPinned(false)
    setFocused(false)
  }

  return <span className={`inline-flex ${className}`} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onKeyDown={onKeyDown}>
    <button
      type="button"
      aria-label={`Ajuda: ${label}`}
      aria-describedby={tipId}
      aria-expanded={open}
      onFocus={() => setFocused(true)}
      onBlur={() => { setFocused(false); setPinned(false) }}
      onClick={() => setPinned((value) => !value)}
      className="grid size-4 shrink-0 place-items-center rounded-full text-text-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    ><HelpCircle aria-hidden="true" size={14} /></button>
    <span
      id={tipId}
      role="tooltip"
      hidden={!open}
      className="absolute left-0 top-full z-30 mt-1 w-64 max-w-[calc(100vw-3rem)] rounded-md border border-border bg-surface px-3 py-2 text-[11px] font-normal leading-4 text-text-secondary shadow-lg"
    >{children}</span>
  </span>
}
