import { BrandMark } from '@/components/brand/BrandMark'
import { NOME_PRODUTO } from '../brand'

/** Símbolo + nome do produto. Único ponto de uso da marca na landing. */
export function Marca({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 text-xl font-bold tracking-tight ${className}`}>
      <BrandMark height={36} />
      {NOME_PRODUTO}
    </span>
  )
}
