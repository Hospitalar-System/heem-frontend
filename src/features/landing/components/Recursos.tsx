import { recursos } from '../content/textos'
import { Reveal } from './Reveal'

export function Recursos() {
  return (
    <section id="recursos" aria-labelledby="recursos-titulo" className="mx-auto w-[min(1120px,100%-32px)] py-24 text-center md:py-[120px]">
      <Reveal>
        <span className="mb-4 block text-sm font-semibold text-[var(--primary-text)]">Recursos</span>
        <h2 id="recursos-titulo" className="text-[clamp(30px,4.6vw,52px)] font-semibold leading-[1.08] tracking-[-0.03em] [text-wrap:balance]">
          Tudo o que a rotina precisa.{' '}
          <br className="max-sm:hidden" />
          Nada além disso.
        </h2>
      </Reveal>
      <ul className="mt-16 grid gap-5 text-left sm:grid-cols-2 lg:grid-cols-3">
        {recursos.map((recurso, i) => (
          <li key={recurso.titulo} className="flex">
            <Reveal delay={(i % 3) * 90} className="flex w-full">
              <article className="flex w-full flex-col gap-3 rounded-[28px] bg-surface px-8 pb-10 pt-9 transition hover:-translate-y-1 hover:bg-[var(--surface-hi)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 lg:min-h-[270px]">
                <div aria-hidden="true" className="mb-[22px] grid size-[52px] place-items-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-text)]">
                  <recurso.icone className="size-[26px]" strokeWidth={1.8} />
                </div>
                <h3 className="text-[22px] font-semibold leading-tight tracking-tight">{recurso.titulo}</h3>
                <p className="text-base text-text-secondary">{recurso.texto}</p>
              </article>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  )
}
