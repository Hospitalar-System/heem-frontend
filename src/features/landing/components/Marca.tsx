import { NOME_PRODUTO, SIGLA } from '../brand'

/** Quadrado com a sigla + nome do produto. Único ponto de uso da marca na landing. */
export function Marca({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 text-xl font-bold tracking-tight ${className}`}>
      <span aria-hidden="true" className="grid size-[30px] place-items-center rounded-[9px] bg-primary text-base font-bold text-[var(--ink)]">{SIGLA}</span>
      {NOME_PRODUTO}
    </span>
  )
}
