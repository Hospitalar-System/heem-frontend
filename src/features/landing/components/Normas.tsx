import { Check } from 'lucide-react'
import { NOME_PRODUTO } from '../brand'
import { normas, notaConformidade, trilhaNormativa } from '../content/normas'
import { useTabs } from '../hooks/useTabs'
import { focusRing } from './button-classes'
import { Reveal } from './Reveal'

export function Normas() {
  const tabs = useTabs(normas.length)

  return (
    <section id="conformidade" aria-labelledby="conformidade-titulo" className="mx-auto w-[min(1120px,100%-32px)]">
      <div className="rounded-[36px] bg-[var(--bg-deep)] px-[22px] py-16 text-center md:px-10 md:py-24">
        <Reveal>
          <span className="mb-4 block text-sm font-semibold text-primary">Conformidade</span>
          <h2 id="conformidade-titulo" className="mx-auto max-w-[20ch] text-[clamp(30px,4.6vw,52px)] font-semibold leading-[1.08] tracking-[-0.03em] [text-wrap:balance]">
            As normas viram parte do trabalho, não uma etapa à parte.
          </h2>
        </Reveal>

        <Reveal delay={120}>
          <div role="tablist" aria-label="Normas" className="mx-auto mt-11 flex max-w-[760px] flex-wrap justify-center gap-2.5">
            {normas.map((norma, i) => {
              const selecionado = i === tabs.index
              return (
                <button
                  key={norma.id}
                  ref={(el) => {
                    tabs.refs.current[i] = el
                  }}
                  type="button"
                  role="tab"
                  id={`norma-aba-${norma.id}`}
                  aria-selected={selecionado}
                  aria-controls={`norma-painel-${norma.id}`}
                  tabIndex={selecionado ? 0 : -1}
                  onClick={() => tabs.select(i)}
                  onKeyDown={(event) => tabs.onKeyDown(event, i)}
                  className={`landing-chip-norma font-mono rounded-full border px-4 py-2.5 text-[13px] ${focusRing} ${
                    selecionado
                      ? 'border-primary bg-[var(--primary-soft)] text-primary'
                      : 'border-border bg-surface text-text-secondary hover:border-primary hover:text-primary'
                  }`}
                >
                  {norma.sigla}
                </button>
              )
            })}
          </div>
        </Reveal>

        <Reveal>
          <div className="mx-auto mt-10 max-w-[1040px] rounded-[32px] border border-border bg-gradient-to-b from-surface to-bg px-5 py-7 text-left md:p-12">
            {normas.map((norma, i) => (
              <div
                key={norma.id}
                id={`norma-painel-${norma.id}`}
                role="tabpanel"
                aria-labelledby={`norma-aba-${norma.id}`}
                hidden={i !== tabs.index}
                className="landing-painel grid items-start gap-7 md:grid-cols-[1.1fr_.9fr] md:gap-12"
              >
                <div>
                  <span className="font-mono mb-3.5 block text-xs font-medium uppercase tracking-[0.06em] text-primary">{norma.orgao}</span>
                  <h3 className="mb-2.5 text-[clamp(26px,3.2vw,38px)] font-semibold leading-[1.12] tracking-tight">{norma.sigla}</h3>
                  <p className="mb-[18px] text-lg">{norma.lead}</p>
                  <p className="mb-3 text-[16.5px] text-text-secondary"><b className="font-semibold text-text-primary">O que é.</b> {norma.oQueE}</p>
                  <p className="mb-3 text-[16.5px] text-text-secondary"><b className="font-semibold text-text-primary">Por que importa.</b> {norma.porQueImporta}</p>
                </div>
                <div className="rounded-3xl border border-primary bg-[var(--bg-deep)] p-7">
                  <span className="font-mono mb-3 block text-[12.5px] text-primary">No {NOME_PRODUTO}</span>
                  <p className="mb-[18px] text-lg leading-snug">{norma.noProduto}</p>
                  <ul className="grid gap-3">
                    {norma.itens.map((item) => (
                      <li key={item} className="relative pl-7 text-[15.5px] text-text-secondary">
                        <span aria-hidden="true" className="absolute left-0 top-[3px] grid size-4 place-items-center rounded-full bg-[var(--primary-soft)] text-primary">
                          <Check className="size-3" strokeWidth={2.4} />
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        <ul className="mt-[72px] grid gap-8 text-left md:grid-cols-3 md:gap-12">
          {trilhaNormativa.map((bloco, i) => (
            <li key={bloco.etapa}>
              <Reveal delay={i * 120}>
                <span className="font-mono mb-3 block text-[12.5px] text-primary">{bloco.etapa}</span>
                <h3 className="mb-2 text-xl font-semibold tracking-tight">{bloco.titulo}</h3>
                <p className="text-base text-text-secondary">{bloco.texto}</p>
              </Reveal>
            </li>
          ))}
        </ul>

        <Reveal>
          <p className="mx-auto mt-14 max-w-[60ch] text-[13.5px] text-text-muted">{notaConformidade(NOME_PRODUTO)}</p>
        </Reveal>
      </div>
    </section>
  )
}
