import { ArrowRight } from 'lucide-react'
import { resolverTela } from '../assets/telas'
import { paineis } from '../content/vitrine'
import type { Interesse } from '../content/vitrine'
import { useTabs } from '../hooks/useTabs'
import { focusRing, landingButtonClasses } from './button-classes'
import { JanelaIndicadores } from './JanelaIndicadores'
import { Reveal } from './Reveal'
import { TelaApp } from './TelaApp'

interface HeroProdutoProps {
  onAgendar: (interesse?: Interesse) => void
}

/** Hero (título, barra "ask" e chips) + vitrine #produto, que compartilham a aba selecionada. */
export function HeroProduto({ onAgendar }: HeroProdutoProps) {
  const tabs = useTabs(paineis.length)
  const ativo = paineis[tabs.index]

  return (
    <>
      <section aria-labelledby="hero-titulo" className="landing-hero relative pb-10 pt-20 text-center">
        <div className="relative mx-auto w-[min(1120px,100%-32px)]">
          <h1 id="hero-titulo" className="landing-hin mx-auto max-w-[15ch] text-[clamp(40px,7vw,84px)] font-bold leading-[1.02] tracking-[-0.045em]">
            A engenharia clínica, <em className="not-italic text-[var(--primary-text)]">em ordem</em>.
          </h1>
          <p className="landing-hin mx-auto mt-5 max-w-[56ch] text-lg text-text-secondary" style={{ animationDelay: '100ms' }}>
            Chamados, ordens de serviço, medições e indicadores de todos os equipamentos do hospital, no computador e no celular, até sem internet.
          </p>
          <div className="landing-hin mt-9 flex flex-wrap justify-center gap-3" style={{ animationDelay: '200ms' }}>
            <button type="button" onClick={() => onAgendar()} className={`${landingButtonClasses.primary} h-12 px-7`}>Agendar demonstração</button>
            <a href="#recursos" className={`${landingButtonClasses.ghost} h-12 px-7`}>Conhecer recursos</a>
          </div>

          <button
            type="button"
            onClick={() => onAgendar(ativo.id)}
            aria-label={`${ativo.pergunta}. Agendar demonstração`}
            className={`landing-hin mx-auto mt-11 flex w-full max-w-[640px] items-center gap-4 rounded-full border border-border bg-surface py-2 pl-7 pr-2 text-left shadow-[0_20px_60px_var(--shadow)] transition hover:border-primary ${focusRing}`}
            style={{ animationDelay: '300ms' }}
          >
            <span className="min-w-0 flex-1 truncate text-[17px]">{ativo.pergunta}</span>
            <span aria-hidden="true" className="grid size-[46px] flex-none place-items-center rounded-full bg-primary text-[var(--ink)]">
              <ArrowRight className="size-5" strokeWidth={2.4} />
            </span>
          </button>

          <div role="tablist" aria-label="Situações do dia a dia" className="landing-hin mt-5 flex flex-wrap justify-center gap-2.5" style={{ animationDelay: '400ms' }}>
            {paineis.map((painel, i) => {
              const selecionado = i === tabs.index
              return (
                <button
                  key={painel.id}
                  ref={(el) => {
                    tabs.refs.current[i] = el
                  }}
                  type="button"
                  role="tab"
                  id={`hero-aba-${painel.id}`}
                  aria-selected={selecionado}
                  aria-controls={`hero-painel-${painel.id}`}
                  tabIndex={selecionado ? 0 : -1}
                  onClick={() => tabs.select(i)}
                  onKeyDown={(event) => tabs.onKeyDown(event, i)}
                  className={`rounded-full border px-[18px] py-3 text-[14.5px] font-medium transition ${focusRing} ${
                    selecionado
                      ? 'border-primary bg-[var(--primary-soft)] text-[var(--primary-text)]'
                      : 'border-border text-text-secondary hover:border-text-secondary hover:text-text-primary'
                  }`}
                >
                  {painel.chip}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <section id="produto" aria-labelledby="produto-titulo" className="mx-auto w-[min(1120px,100%-32px)] pb-24">
        <h2 id="produto-titulo" className="sr-only">O produto</h2>
        <Reveal variant="scale">
          <div className="min-h-[560px] overflow-hidden rounded-[36px] border border-border bg-gradient-to-b from-surface to-[var(--bg-deep)] px-5 py-8 text-left md:p-14">
            {paineis.map((painel, i) => (
              <div
                key={painel.id}
                id={`hero-painel-${painel.id}`}
                role="tabpanel"
                aria-labelledby={`hero-aba-${painel.id}`}
                hidden={i !== tabs.index}
                className="landing-painel grid items-center gap-8 md:grid-cols-2 md:gap-14"
              >
                <div>
                  <h3 className="mb-[18px] text-[clamp(26px,3.2vw,38px)] font-semibold leading-[1.12] tracking-tight">{painel.titulo}</h3>
                  {painel.paragrafos.map((texto) => (
                    <p key={texto} className="mb-3 text-[17px] text-text-secondary">{texto}</p>
                  ))}
                  <span className="mt-3.5 block text-[13px] text-text-muted">{painel.nota}</span>
                  <button type="button" onClick={() => onAgendar(painel.id)} className={`${landingButtonClasses.ghost} mt-6`}>
                    Quero ver isso na demonstração
                  </button>
                </div>
                <div className="flex items-start justify-center gap-5">
                  {painel.telas.length === 0 ? (
                    <JanelaIndicadores />
                  ) : (
                    painel.telas.map((chave, j) => (
                      <TelaApp key={chave} {...resolverTela(chave)} className={j > 0 ? 'max-[900px]:hidden' : ''} />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>
    </>
  )
}
