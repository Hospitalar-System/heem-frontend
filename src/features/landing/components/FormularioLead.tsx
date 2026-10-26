import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { descreverErroLead, enviarLead } from '../api/enviarLead'
import { NOME_PRODUTO } from '../brand'
import { leadSchema, opcoesCargo, opcoesInteresse, type LeadFormValues, type ValorInteresse } from '../schemas/lead-schema'
import { landingButtonClasses } from './button-classes'
import { SelectLanding } from './SelectLanding'

interface FormularioLeadProps {
  interesseInicial?: ValorInteresse
  /** Fecha o diálogo (botão "Voltar à página"). */
  onConcluir: () => void
  /** Informa ao diálogo que há envio em andamento (bloqueia Escape e clique fora). */
  onEnviando?: (enviando: boolean) => void
}

const campoClasses =
  'w-full min-h-[48px] rounded-xl border bg-bg px-3.5 py-3 text-base text-text-primary placeholder:text-text-muted outline-none transition hover:border-text-secondary focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary'

function Campo({ id, rotulo, erro, children }: { id: string; rotulo: string; erro?: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label id={`${id}-rotulo`} htmlFor={id} className="text-[13.5px] font-medium text-text-secondary">{rotulo}</label>
      {children}
      {erro && <p id={`${id}-erro`} className="text-sm text-[var(--danger-text)]">{erro}</p>}
    </div>
  )
}

export function FormularioLead({ interesseInicial, onConcluir, onEnviando }: FormularioLeadProps) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: { nome: '', email: '', organizacao: '', cargo: '', telefone: '', interesse: interesseInicial ?? '', consentimento: false, contato_alt: '' },
  })
  const [enviando, setEnviando] = useState(false)
  const [concluido, setConcluido] = useState(false)
  const [erroGeral, setErroGeral] = useState('')
  const emVoo = useRef(false)
  const tituloSucesso = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (concluido) tituloSucesso.current?.focus()
  }, [concluido])

  const aoEnviar = handleSubmit(async (valores) => {
    if (emVoo.current) return
    emVoo.current = true
    setEnviando(true)
    onEnviando?.(true)
    setErroGeral('')
    try {
      await enviarLead(valores)
      setConcluido(true)
    } catch (erro) {
      const { mensagem, campo } = descreverErroLead(erro)
      setErroGeral(mensagem)
      if (campo) setError(campo, { message: mensagem })
    } finally {
      emVoo.current = false
      setEnviando(false)
      onEnviando?.(false)
    }
  })

  if (concluido) {
    return (
      <div className="py-3 text-center">
        <div aria-hidden="true" className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-[var(--primary-soft)] text-[var(--primary-text)]">
          <Check className="size-8" strokeWidth={2.6} />
        </div>
        <h3 ref={tituloSucesso} tabIndex={-1} className="mb-2 text-2xl font-semibold outline-none">Cadastro recebido</h3>
        <p role="status" className="mb-6 text-text-secondary">Obrigado! Em breve entraremos em contato pelo e-mail informado.</p>
        <button type="button" onClick={onConcluir} className={`${landingButtonClasses.ghost} h-12 px-7`}>Voltar à página</button>
      </div>
    )
  }

  const descrito = (campo: keyof LeadFormValues) => (errors[campo] ? `${campo}-erro` : undefined)
  const borda = (campo: keyof LeadFormValues) => (errors[campo] ? 'border-danger' : 'border-border')

  return (
    <form onSubmit={aoEnviar} noValidate className="grid gap-3.5" aria-label={`Quero conhecer o ${NOME_PRODUTO}`}>
      <Campo id="nome" rotulo="Nome completo *" erro={errors.nome?.message}>
        <input id="nome" type="text" autoComplete="name" placeholder="Maria Souza" aria-invalid={!!errors.nome} aria-describedby={descrito('nome')} aria-required="true" className={`${campoClasses} ${borda('nome')}`} {...register('nome')} />
      </Campo>
      <Campo id="email" rotulo="E-mail profissional *" erro={errors.email?.message}>
        <input id="email" type="email" autoComplete="email" placeholder="maria@hospital.org.br" aria-invalid={!!errors.email} aria-describedby={descrito('email')} aria-required="true" className={`${campoClasses} ${borda('email')}`} {...register('email')} />
      </Campo>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Campo id="organizacao" rotulo="Hospital ou instituição *" erro={errors.organizacao?.message}>
          <input id="organizacao" type="text" autoComplete="organization" placeholder="Hospital Santa Casa" aria-invalid={!!errors.organizacao} aria-describedby={descrito('organizacao')} aria-required="true" className={`${campoClasses} ${borda('organizacao')}`} {...register('organizacao')} />
        </Campo>
        <Campo id="cargo" rotulo="Cargo" erro={errors.cargo?.message}>
          <Controller
          name="cargo"
          control={control}
          render={({ field }) => (
            <SelectLanding id="cargo" name={field.name} rotuloId="cargo-rotulo" opcoes={opcoesCargo.map((cargo) => ({ valor: cargo, rotulo: cargo }))} valor={field.value} onChange={field.onChange} onBlur={field.onBlur} inputRef={field.ref} invalido={!!errors.cargo} descritoPor={descrito('cargo')} />
          )}
        />
        </Campo>
      </div>
      <Campo id="telefone" rotulo="Telefone (opcional)" erro={errors.telefone?.message}>
        <input id="telefone" type="tel" autoComplete="tel" placeholder="(51) 90000-0000" aria-invalid={!!errors.telefone} aria-describedby={descrito('telefone')} className={`${campoClasses} ${borda('telefone')}`} {...register('telefone')} />
      </Campo>
      <Campo id="interesse" rotulo="O que você quer resolver?">
        <Controller
          name="interesse"
          control={control}
          render={({ field }) => (
            <SelectLanding id="interesse" name={field.name} rotuloId="interesse-rotulo" opcoes={opcoesInteresse.map((opcao) => ({ valor: opcao.valor, rotulo: opcao.rotulo }))} valor={field.value} onChange={field.onChange} onBlur={field.onBlur} inputRef={field.ref} />
          )}
        />
      </Campo>

      <div className="grid gap-1.5">
        <div className="grid grid-cols-[24px_1fr] items-start gap-2.5 text-[13px] text-text-muted">
          <input id="consentimento" type="checkbox" aria-invalid={!!errors.consentimento} aria-describedby={descrito('consentimento')} aria-required="true" className="mt-0.5 size-5 accent-[var(--primary)] outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg" {...register('consentimento')} />
          <label htmlFor="consentimento">
            Concordo em receber contato sobre o {NOME_PRODUTO} e que meus dados sejam usados para esse fim, conforme a LGPD.{' '}
            <a href="/privacidade" target="_blank" rel="noopener" className="rounded-sm underline underline-offset-2 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Política de Privacidade</a>
          </label>
        </div>
        {errors.consentimento && <p id="consentimento-erro" className="text-sm text-[var(--danger-text)]">{errors.consentimento.message}</p>}
      </div>

      {/* Campo isca: invisível e fora da tabulação; humanos o deixam vazio. */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-[9999px] size-px overflow-hidden opacity-0">
        <label htmlFor="contato_alt">Não preencha este campo</label>
        <input id="contato_alt" type="text" tabIndex={-1} autoComplete="off" data-lpignore="true" data-1p-ignore {...register('contato_alt')} />
      </div>

      <div role="alert" aria-live="assertive" className={erroGeral ? 'rounded-xl bg-[var(--danger-soft)] px-3.5 py-3 text-sm text-[var(--danger-text)]' : 'hidden'}>{erroGeral}</div>

      <button type="submit" disabled={enviando} aria-busy={enviando} className={`${landingButtonClasses.primary} mt-1 h-[52px] w-full text-base disabled:cursor-not-allowed disabled:opacity-70`}>
        {enviando ? (<><Loader2 className="mr-2 size-4 motion-safe:animate-spin" aria-hidden="true" />Enviando…</>) : erroGeral ? 'Tentar de novo' : 'Enviar cadastro'}
      </button>
    </form>
  )
}
