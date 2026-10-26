import { NOME_PRODUTO } from '../brand'
import { textoCtaFinal } from '../content/textos'
import type { Interesse } from '../content/vitrine'
import { landingButtonClasses } from './button-classes'
import { Reveal } from './Reveal'

interface ChamadaFinalProps {
  onAgendar: (interesse?: Interesse) => void
}

export function ChamadaFinal({ onAgendar }: ChamadaFinalProps) {
  const { titulo, texto } = textoCtaFinal(NOME_PRODUTO)
  return (
    <section id="contato" aria-labelledby="contato-titulo" className="mx-auto w-[min(1120px,100%-32px)] pb-24 pt-10">
      <Reveal variant="scale">
        <div className="landing-cta rounded-[40px] px-8 py-24 text-center">
          <h2 id="contato-titulo" className="mx-auto max-w-[16ch] text-[clamp(32px,5vw,58px)] font-bold leading-[1.05] tracking-[-0.04em] [text-wrap:balance]">
            {titulo}
          </h2>
          <p className="mx-auto mb-9 mt-5 max-w-[48ch] text-lg text-text-secondary">{texto}</p>
          <button type="button" onClick={() => onAgendar()} className={`${landingButtonClasses.primary} h-12 px-7`}>
            Agendar demonstração
          </button>
        </div>
      </Reveal>
    </section>
  )
}
