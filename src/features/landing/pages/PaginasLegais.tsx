import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { NOME_PRODUTO } from '../brand'
import { LandingLayout } from '../components/LandingLayout'
import { focusRing } from '../components/button-classes'
import { AVISO_PROVISORIO, politicaPrivacidade, termosDeUso, type DocumentoLegal } from '../legais/conteudo'
import { useDocumentHead } from '../useDocumentHead'

const PENDENTE = /(\[PENDENTE[^\]]*\])/

/** Destaca cada `[PENDENTE: ...]` (visível, com contorno tracejado, nunca só por cor). */
function comPendentes(texto: string) {
  return texto.split(PENDENTE).map((parte, indice) =>
    PENDENTE.test(parte) ? (
      <mark key={indice} className="landing-pendente">{parte}</mark>
    ) : (
      <Fragment key={indice}>{parte}</Fragment>
    ),
  )
}

function VoltarInicio({ className = '' }: { className?: string }) {
  return (
    <Link to="/" className={`inline-flex rounded-md text-[var(--primary-text)] underline underline-offset-4 ${focusRing} ${className}`}>
      Voltar à página inicial
    </Link>
  )
}

function PaginaLegal({ documento }: { documento: DocumentoLegal }) {
  useDocumentHead({ title: `${documento.titulo} | ${NOME_PRODUTO}`, description: documento.descricao, path: documento.path })

  return (
    <LandingLayout>
      <article className="mx-auto w-[min(760px,100%-32px)] pb-16 pt-10">
        <VoltarInicio />
        <h1 className="mt-6 text-[clamp(30px,5vw,44px)] font-bold leading-tight tracking-tight">{documento.titulo}</h1>
        <p role="note" className="landing-aviso mt-5 rounded-xl border border-warning px-4 py-3 text-sm font-semibold">
          {AVISO_PROVISORIO}
        </p>
        <nav aria-label="Nesta página" className="mt-8 rounded-2xl border border-border bg-surface p-5">
          <p className="mb-3 text-sm font-semibold text-text-secondary">Nesta página</p>
          <ol className="grid list-decimal gap-1.5 pl-5 text-sm sm:grid-cols-2">
            {documento.secoes.map((secao) => (
              <li key={secao.id}>
                <a href={`#${secao.id}`} className={`rounded-sm underline-offset-4 hover:underline ${focusRing}`}>{secao.titulo}</a>
              </li>
            ))}
          </ol>
        </nav>
        {documento.secoes.map((secao) => (
          <section key={secao.id} id={secao.id} aria-labelledby={`${secao.id}-titulo`} className="mt-10">
            <h2 id={`${secao.id}-titulo`} className="text-xl font-semibold tracking-tight">{secao.titulo}</h2>
            {secao.paragrafos.map((paragrafo) => (
              <p key={paragrafo} className="mt-3 text-text-secondary">{comPendentes(paragrafo)}</p>
            ))}
            {secao.itens && (
              <ul className="mt-3 list-disc space-y-1 pl-6 text-text-secondary">
                {secao.itens.map((item) => <li key={item}>{comPendentes(item)}</li>)}
              </ul>
            )}
          </section>
        ))}
        <VoltarInicio className="mt-12" />
      </article>
    </LandingLayout>
  )
}

export function PoliticaPrivacidadePage() {
  return <PaginaLegal documento={politicaPrivacidade} />
}

export function TermosDeUsoPage() {
  return <PaginaLegal documento={termosDeUso} />
}
