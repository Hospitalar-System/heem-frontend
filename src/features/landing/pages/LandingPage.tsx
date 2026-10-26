import { LandingLayout } from '../components/LandingLayout'
import { landingButtonClasses } from '../components/button-classes'

const sectionClass = 'mx-auto w-[min(1120px,100%-32px)] py-24 text-center'
const h2Class = 'text-3xl font-semibold tracking-tight md:text-5xl'

export function LandingPage() {
  return (
    <LandingLayout>
      <div id="topo" />
      <section aria-labelledby="hero-titulo" className="relative pb-10 pt-20 text-center">
        <div className="mx-auto w-[min(1120px,100%-32px)]">
          <h1 id="hero-titulo" className="mx-auto max-w-[15ch] text-[clamp(40px,7vw,84px)] font-bold leading-[1.02] tracking-[-0.045em]">
            A engenharia clínica, <em className="not-italic text-primary">em ordem</em>.
          </h1>
          <p className="mx-auto mt-5 max-w-[56ch] text-lg text-text-secondary">
            Chamados, ordens de serviço, medições e indicadores de todos os equipamentos do hospital, no computador e no celular, até sem internet.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <a href="#contato" className={`${landingButtonClasses.primary} h-12 px-7`}>Agendar demonstração</a>
            <a href="#recursos" className={`${landingButtonClasses.ghost} h-12 px-7`}>Conhecer recursos</a>
          </div>
        </div>
      </section>

      <section id="produto" aria-labelledby="produto-titulo" className={sectionClass}>
        <h2 id="produto-titulo" className={h2Class}>O produto</h2>
      </section>
      <section id="recursos" aria-labelledby="recursos-titulo" className={sectionClass}>
        <h2 id="recursos-titulo" className={h2Class}>Recursos</h2>
      </section>
      <section id="conformidade" aria-labelledby="conformidade-titulo" className={sectionClass}>
        <h2 id="conformidade-titulo" className={h2Class}>Conformidade</h2>
      </section>
      <section id="para-quem" aria-labelledby="para-quem-titulo" className={sectionClass}>
        <h2 id="para-quem-titulo" className={h2Class}>Para quem</h2>
      </section>
      <section id="contato" aria-labelledby="contato-titulo" className={sectionClass}>
        <h2 id="contato-titulo" className={h2Class}>Contato</h2>
      </section>
    </LandingLayout>
  )
}
