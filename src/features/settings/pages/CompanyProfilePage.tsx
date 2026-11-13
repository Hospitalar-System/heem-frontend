import { zodResolver } from '@hookform/resolvers/zod'
import { Info, TriangleAlert } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ChangeEvent, type ReactNode } from 'react'
import { useForm, type Path } from 'react-hook-form'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { Field, Modal } from '@/components/ui/Modal'
import { getAuthState, subscribeAuthState } from '@/features/auth/session'
import { maskCep, maskCnpj, onlyDigits } from '@/lib/br-documents'
import { getCompanyErrorMessage, isCompanyConflict, LOGO_MAX_BYTES, LOGO_TYPES, useCompanyProfile, useDeleteCompanyLogo, useSaveBrandColor, useSaveCompanyProfile, useSetCompanyLogo } from '../api/company'
import { SettingsNav } from '../components/SettingsNav'
import { companySchema, type CompanyFormValues } from '../schemas/company.schema'
import { DEFAULT_BRAND_COLOR, type CompanyProfile, type CompanyProfileInput } from '../types/company'
import { isValidHex, readableTextOn } from '../utils/brand'

const inputClass = 'h-10 w-full rounded-md border border-border bg-bg px-3 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-default disabled:bg-surface disabled:text-text-secondary'
const cardClass = 'rounded-lg border border-border bg-surface p-5'
const primaryButton = 'h-9 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50'
const secondaryButton = 'h-9 rounded-md border border-border px-3 text-xs text-text-primary outline-none hover:bg-bg focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50'
const REPORT_NOTICE = 'O logo e a cor da marca aparecem nos relatórios em PDF (cabeçalho e destaques). Sem logo, os relatórios mostram só o nome da empresa.'

const emptyForm: CompanyFormValues = { razaoSocial: '', cnpj: '', contratoNumero: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', cep: '', contatoTelefone: '', contatoEmail: '', responsavelTecnicoNome: '', responsavelTecnicoCrea: '' }

function toFormValues(profile: CompanyProfile): CompanyFormValues {
  const e = profile.endereco ?? {}
  return {
    razaoSocial: profile.razaoSocial ?? '', cnpj: maskCnpj(profile.cnpj ?? ''), contratoNumero: profile.contratoNumero ?? '',
    logradouro: e.logradouro ?? '', numero: e.numero ?? '', complemento: e.complemento ?? '', bairro: e.bairro ?? '', cidade: e.cidade ?? '', uf: e.uf ?? '', cep: maskCep(e.cep ?? ''),
    contatoTelefone: profile.contatoTelefone ?? '', contatoEmail: profile.contatoEmail ?? '',
    responsavelTecnicoNome: profile.responsavelTecnicoNome ?? '', responsavelTecnicoCrea: profile.responsavelTecnicoCrea ?? '',
  }
}

const orNull = (value: string) => value.trim() || null

/** Corpo do PUT /prestadora: só os campos do cadastro (nunca cadastrada, corMarca, logoUrl, atualizadoEm). */
// eslint-disable-next-line react-refresh/only-export-components -- exportado para os testes
export function toCompanyInput(values: CompanyFormValues): CompanyProfileInput {
  return {
    razaoSocial: values.razaoSocial.trim(), cnpj: onlyDigits(values.cnpj), contratoNumero: orNull(values.contratoNumero),
    endereco: { logradouro: orNull(values.logradouro), numero: orNull(values.numero), complemento: orNull(values.complemento), bairro: orNull(values.bairro), cidade: orNull(values.cidade), uf: orNull(values.uf)?.toUpperCase() ?? null, cep: onlyDigits(values.cep) || null },
    contatoTelefone: orNull(values.contatoTelefone), contatoEmail: orNull(values.contatoEmail),
    responsavelTecnicoNome: orNull(values.responsavelTecnicoNome), responsavelTecnicoCrea: orNull(values.responsavelTecnicoCrea),
  }
}

/**
 * Perfil da empresa prestadora. Admin edita; técnico e interno do hospital veem tudo em leitura.
 * A leitura para técnico/interno é só por URL (/settings/company): não há item de menu para esses papéis.
 */
export function CompanyProfilePage() {
  const auth = useSyncExternalStore(subscribeAuthState, getAuthState, getAuthState)
  const roles = auth.user?.roles ?? []
  if (!roles.some((role) => role === 'admin_cliente' || role === 'tecnico' || role === 'interno_hospital')) return <Navigate to="/access-denied" replace />
  return <CompanyProfileContent canEdit={roles.includes('admin_cliente')} />
}

function CompanyProfileContent({ canEdit }: { canEdit: boolean }) {
  const profile = useCompanyProfile()
  return <AdminPageShell tabs={<SettingsNav />} title="Perfil da empresa" subtitle="Dados da prestadora usados nos relatórios">
    <div className="mx-auto max-w-3xl space-y-5">
      <p role="note" className="flex gap-3 rounded-md border border-border bg-surface p-3 text-sm text-text-primary"><Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />{REPORT_NOTICE}</p>
      {profile.isLoading ? <p role="status" className="text-sm text-text-secondary">Carregando perfil da empresa…</p> : null}
      {profile.isError ? <p role="alert" className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">Não foi possível carregar o perfil da empresa. <button type="button" className="underline" onClick={() => void profile.refetch()}>Tentar novamente</button></p> : null}
      {profile.data ? <>
        {!profile.data.cadastrada ? <p role="status" className="flex gap-3 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-text-primary"><TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />Complete razão social e CNPJ para que o perfil apareça nos relatórios.</p> : null}
        <CompanyForm profile={profile.data} canEdit={canEdit} />
        <BrandColorSection profile={profile.data} canEdit={canEdit} />
        <LogoSection profile={profile.data} canEdit={canEdit} />
      </> : null}
    </div>
  </AdminPageShell>
}

function Section({ title, children, id }: { title: string; children: ReactNode; id: string }) {
  return <section aria-labelledby={id}><h2 id={id} className="mb-3 text-sm font-semibold text-text-primary">{title}</h2>{children}</section>
}

function CompanyForm({ profile, canEdit }: { profile: CompanyProfile; canEdit: boolean }) {
  const save = useSaveCompanyProfile()
  const [serverError, setServerError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const client = useQueryClient()
  const values = useMemo(() => toFormValues(profile), [profile])
  const form = useForm<CompanyFormValues>({ resolver: zodResolver(companySchema), defaultValues: emptyForm, values })
  const { errors } = form.formState
  const text = (name: Path<CompanyFormValues>, label: string, extra: { mask?: (v: string) => string; type?: string; inputMode?: 'numeric'; autoComplete?: string; className?: string } = {}) => {
    const reg = form.register(name)
    const onChange = (event: ChangeEvent<HTMLInputElement>) => { if (extra.mask) event.target.value = extra.mask(event.target.value); return reg.onChange(event) }
    return <Field label={label} error={errors[name]?.message}><input {...reg} onChange={onChange} type={extra.type ?? 'text'} inputMode={extra.inputMode} autoComplete={extra.autoComplete ?? 'off'} className={`${inputClass} ${extra.className ?? ''}`} aria-invalid={errors[name] ? true : undefined} /></Field>
  }
  const submit = form.handleSubmit(async (data) => {
    setServerError(null); setConflict(false)
    try { await save.mutateAsync(toCompanyInput(data)); toast.success('Perfil da empresa salvo.') } catch (error) {
      const message = getCompanyErrorMessage(error, 'Não foi possível salvar o perfil da empresa.')
      setServerError(message); setConflict(isCompanyConflict(error)); toast.error(message)
    }
  })
  return <form onSubmit={submit} noValidate className="space-y-5" aria-label="Cadastro da empresa">
    {serverError ? <p role="alert" className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{serverError}{conflict ? <> <button type="button" className="underline" onClick={() => { setServerError(null); setConflict(false); void client.invalidateQueries({ queryKey: ['company-profile'] }) }}>Recarregar perfil</button></> : null}</p> : null}
    <fieldset disabled={!canEdit || save.isPending} className="min-w-0 space-y-5 border-0 p-0">
      <Section id="sec-ident" title="Identificação"><div className={`${cardClass} grid gap-4 sm:grid-cols-2`}>
        <div className="sm:col-span-2">{text('razaoSocial', 'Razão social')}</div>
        {text('cnpj', 'CNPJ', { mask: maskCnpj, inputMode: 'numeric' })}
        {text('contratoNumero', 'Número do contrato')}
      </div></Section>
      <Section id="sec-end" title="Endereço"><div className={`${cardClass} grid gap-4 sm:grid-cols-6`}>
        <div className="sm:col-span-4">{text('logradouro', 'Logradouro', { autoComplete: 'street-address' })}</div>
        <div className="sm:col-span-2">{text('numero', 'Número')}</div>
        <div className="sm:col-span-3">{text('complemento', 'Complemento')}</div>
        <div className="sm:col-span-3">{text('bairro', 'Bairro')}</div>
        <div className="sm:col-span-3">{text('cidade', 'Cidade')}</div>
        <div className="sm:col-span-1">{text('uf', 'UF', { mask: (v) => v.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2), className: 'uppercase' })}</div>
        <div className="sm:col-span-2">{text('cep', 'CEP', { mask: maskCep, inputMode: 'numeric', autoComplete: 'postal-code' })}</div>
      </div></Section>
      <Section id="sec-contato" title="Contato"><div className={`${cardClass} grid gap-4 sm:grid-cols-2`}>
        {text('contatoTelefone', 'Telefone', { type: 'tel', autoComplete: 'tel' })}
        {text('contatoEmail', 'E-mail', { type: 'email', autoComplete: 'email' })}
      </div></Section>
      <Section id="sec-rt" title="Responsável técnico"><div className={`${cardClass} grid gap-4 sm:grid-cols-2`}>
        {text('responsavelTecnicoNome', 'Nome do responsável técnico')}
        {text('responsavelTecnicoCrea', 'CREA')}
      </div></Section>
    </fieldset>
    {canEdit ? <div className="flex justify-end"><button type="submit" disabled={save.isPending} className={primaryButton}>{save.isPending ? 'Salvando…' : 'Salvar cadastro'}</button></div> : null}
  </form>
}

function BrandColorSection({ profile, canEdit }: { profile: CompanyProfile; canEdit: boolean }) {
  const saved = profile.corMarca && isValidHex(profile.corMarca) ? profile.corMarca.toUpperCase() : DEFAULT_BRAND_COLOR
  const [draft, setDraft] = useState(saved)
  useEffect(() => setDraft(saved), [saved])
  const save = useSaveBrandColor()
  const valid = isValidHex(draft)
  const color = valid ? draft.toUpperCase() : saved
  const text = readableTextOn(color)
  const lowContrast = text.ratio < 4.5
  const dirty = valid && color !== saved
  async function submit() {
    try { await save.mutateAsync(color === DEFAULT_BRAND_COLOR ? null : color); toast.success('Cor da marca salva.') } catch (error) { toast.error(getCompanyErrorMessage(error, 'Não foi possível salvar a cor da marca.')) }
  }
  return <Section id="sec-cor" title="Cor da marca"><div className={`${cardClass} space-y-4`}>
    <div className="flex flex-wrap items-end gap-3">
      <label className="block space-y-1.5 text-xs font-medium text-text-secondary"><span>Seletor de cor</span><input type="color" disabled={!canEdit || save.isPending} value={color.toLowerCase()} onChange={(event) => setDraft(event.target.value.toUpperCase())} className="block h-10 w-14 cursor-pointer rounded-md border border-border bg-bg p-1 disabled:cursor-default" /></label>
      <div className="w-40"><Field label="Cor (#RRGGBB)" error={valid ? undefined : 'Use o formato #RRGGBB, por exemplo #3ED597.'}><input value={draft} onChange={(event) => setDraft(event.target.value.trim())} disabled={!canEdit || save.isPending} maxLength={7} spellCheck={false} aria-invalid={valid ? undefined : true} className={`${inputClass} font-mono uppercase`} /></Field></div>
      {canEdit ? <>
        <button type="button" onClick={() => setDraft(DEFAULT_BRAND_COLOR)} disabled={save.isPending || draft.toUpperCase() === DEFAULT_BRAND_COLOR} className={secondaryButton}>Restaurar padrão</button>
        <button type="button" onClick={() => void submit()} disabled={!dirty || save.isPending} className={primaryButton}>{save.isPending ? 'Salvando…' : 'Salvar cor'}</button>
      </> : null}
    </div>
    <div aria-label="Pré-visualização da marca" role="group" className="overflow-hidden rounded-md border border-border">
      <div className="px-4 py-3 text-sm font-semibold" style={{ backgroundColor: color, color: text.color }}>{profile.razaoSocial || 'Nome da empresa'}</div>
      <div className="flex flex-wrap items-center gap-3 bg-bg p-4">
        <span className="rounded-md px-3 py-1.5 text-xs font-semibold" style={{ backgroundColor: color, color: text.color }}>Botão de exemplo</span>
        <span className="rounded-full border px-2.5 py-0.5 text-[11px] font-medium" style={{ borderColor: color, backgroundColor: color, color: text.color }}>Selo</span>
      </div>
    </div>
    <p className="text-xs text-text-secondary">Contraste do texto sobre a cor: {text.ratio.toFixed(1)}:1.</p>
    {lowContrast ? <p role="alert" className="flex gap-2 text-xs text-warning"><TriangleAlert aria-hidden="true" className="size-4 shrink-0" />Contraste baixo: o texto sobre esta cor pode ficar difícil de ler nos relatórios. Considere uma cor mais clara ou mais escura.</p> : null}
  </div></Section>
}

function LogoSection({ profile, canEdit }: { profile: CompanyProfile; canEdit: boolean }) {
  const [file, setFile] = useState<File | null>(null)
  const [localUrl, setLocalUrl] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const upload = useSetCompanyLogo()
  const remove = useDeleteCompanyLogo()
  useEffect(() => {
    if (!file || typeof URL.createObjectURL !== 'function') { setLocalUrl(null); return }
    const url = URL.createObjectURL(file)
    setLocalUrl(url)
    return () => URL.revokeObjectURL?.(url)
  }, [file])

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0]
    event.target.value = ''
    setFileError(null)
    if (!chosen) return
    if (!(LOGO_TYPES as readonly string[]).includes(chosen.type)) { setFile(null); setFileError('Formato não aceito. Envie uma imagem PNG ou JPEG.'); return }
    if (chosen.size > LOGO_MAX_BYTES) { setFile(null); setFileError('Arquivo muito grande. O logo deve ter no máximo 2 MB.'); return }
    setFile(chosen)
  }
  async function send() {
    if (!file) return
    try { await upload.mutateAsync(file); setFile(null); toast.success('Logo atualizado.') } catch (error) { setFileError(getCompanyErrorMessage(error, 'Não foi possível enviar o logo. Verifique a conexão e tente novamente.')) }
  }
  async function removeLogo() {
    try { await remove.mutateAsync(); setConfirmRemove(false); toast.success('Logo removido.') } catch (error) { setConfirmRemove(false); toast.error(getCompanyErrorMessage(error, 'Não foi possível remover o logo.')) }
  }
  const shown = localUrl ?? profile.logoUrl ?? null
  return <Section id="sec-logo" title="Logo"><div className={`${cardClass} space-y-4`}>
    <div className="flex min-h-24 items-center justify-center rounded-md border border-dashed border-border bg-bg p-4">
      {shown ? <img src={shown} alt={localUrl ? 'Pré-visualização do novo logo' : 'Logo atual da empresa'} className="max-h-24 max-w-full object-contain" /> : <p className="text-sm text-text-muted">Nenhum logo enviado.</p>}
    </div>
    {file ? <p className="text-xs text-text-secondary">Arquivo selecionado: {file.name}. Ele só será usado depois de enviado.</p> : null}
    {fileError ? <p role="alert" className="text-xs text-danger">{fileError}</p> : null}
    {canEdit ? <div className="flex flex-wrap gap-2">
      <input ref={inputRef} type="file" accept={LOGO_TYPES.join(',')} onChange={choose} aria-label="Arquivo do logo" className="sr-only" tabIndex={-1} />
      <button type="button" disabled={upload.isPending} onClick={() => inputRef.current?.click()} className={secondaryButton}>{profile.logoUrl ? 'Trocar logo' : 'Escolher arquivo'}</button>
      {file ? <button type="button" disabled={upload.isPending} onClick={() => void send()} className={primaryButton}>{upload.isPending ? 'Enviando…' : 'Enviar logo'}</button> : null}
      {profile.logoUrl && !file ? <button type="button" disabled={remove.isPending} onClick={() => setConfirmRemove(true)} className={`${secondaryButton} text-danger`}>Remover logo</button> : null}
    </div> : null}
    <p className="text-[11px] text-text-muted">PNG ou JPEG, até 2 MB.</p>
    {confirmRemove ? <Modal title="Remover logo?" description="Sem logo, os relatórios em PDF mostram só o nome da empresa." onClose={() => setConfirmRemove(false)} busy={remove.isPending}>
      <div className="flex justify-end gap-2"><button type="button" disabled={remove.isPending} onClick={() => setConfirmRemove(false)} className={secondaryButton}>Cancelar</button><button type="button" disabled={remove.isPending} onClick={() => void removeLogo()} className="h-9 rounded-md bg-danger px-3 text-xs font-semibold text-white disabled:opacity-50">{remove.isPending ? 'Removendo…' : 'Remover'}</button></div>
    </Modal> : null}
  </div></Section>
}
