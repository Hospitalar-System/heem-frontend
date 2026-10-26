import { TELA_ALTURA, TELA_LARGURA } from '../assets/telas'

interface TelaAppProps {
  src: string
  alt: string
  className?: string
}

/** Moldura de celular (236 px, tema escuro) com a captura de uma tela do app. Dimensões fixas evitam layout shift. */
export function TelaApp({ src, alt, className = '' }: TelaAppProps) {
  return (
    <div className={`w-[236px] flex-none rounded-[38px] border border-border bg-[var(--phone)] p-[9px] shadow-[0_30px_70px_var(--shadow)] ${className}`}>
      <img
        src={src}
        alt={alt}
        width={TELA_LARGURA}
        height={TELA_ALTURA}
        loading="lazy"
        decoding="async"
        className="block h-auto w-full rounded-[30px]"
      />
    </div>
  )
}
