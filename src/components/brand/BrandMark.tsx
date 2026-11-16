/** Símbolo do HEEM (PNG transparente com 1x e 2x). A proporção do arquivo é 53:64 (largura:altura). */
/** `alt` vazio quando o nome do produto já aparece em texto ao lado (evita leitura duplicada). */
export function BrandMark({ height = 32, className = '', alt = 'HEEM' }: { height?: number; className?: string; alt?: string }) {
  return (
    <img
      src="/simbolo-64.png"
      srcSet="/simbolo-64.png 1x, /simbolo-128.png 2x"
      alt={alt}
      data-brand-mark=""
      width={Math.round((height * 53) / 64)}
      height={height}
      decoding="async"
      className={`shrink-0 select-none ${className}`}
    />
  )
}
