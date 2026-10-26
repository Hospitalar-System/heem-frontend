import { perfis } from '../content/textos'
import { Reveal } from './Reveal'

const avatarClasses = [
  'bg-primary text-[var(--ink)]',
  'bg-[var(--surface-hi)] text-text-primary',
  'bg-warning text-[var(--on-warn)]',
  'bg-[var(--danger-soft)] text-[var(--danger-text)]',
]

export function ParaQuem() {
  return (
    <section id="para-quem" aria-labelledby="para-quem-titulo" className="mx-auto w-[min(1120px,100%-32px)] py-24 text-center md:py-[120px]">
      <Reveal>
        <span className="mb-4 block text-sm font-semibold text-[var(--primary-text)]">Para quem</span>
        <h2 id="para-quem-titulo" className="text-[clamp(30px,4.6vw,52px)] font-semibold leading-[1.08] tracking-[-0.03em] [text-wrap:balance]">
          Cada pessoa vê só o que precisa.
        </h2>
      </Reveal>
      <ul className="mt-16 grid gap-5 text-left sm:grid-cols-2 lg:grid-cols-4">
        {perfis.map((perfil, i) => (
          <li key={perfil.titulo} className="flex">
            <Reveal variant="scale" delay={i * 100} className="flex w-full">
              <article className="w-full rounded-[28px] bg-surface p-8 transition hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                <div aria-hidden="true" className={`mb-[22px] grid size-12 place-items-center rounded-full text-sm font-bold ${avatarClasses[i]}`}>
                  {perfil.iniciais}
                </div>
                <h3 className="mb-2 text-lg font-semibold tracking-tight">{perfil.titulo}</h3>
                <p className="text-[15px] text-text-secondary">{perfil.texto}</p>
              </article>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  )
}
